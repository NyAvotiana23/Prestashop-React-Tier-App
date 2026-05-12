import {useState} from 'react';
import CsvUploader from "../csv/CsvUploader.jsx";
import CsvTemplateHolder from "../csv/CsvTemplateHolder.jsx";
import {CSV_IMPORT_CONFIGS} from "../csv/csvImportConfig.js";
import {importCsvResource} from "../csv/csvImporter.js";
import {parseCsvText} from "../csv/csvImportUtils.js";
import {importImagesFromZip} from "../csv/mappings/imageMappingZip.js";

function ImportDatabase() {
    const importRows = [
        {ref: "products", name: "Products", type: "csv"},
        {ref: "combinations", name: "Combinations", type: "csv"},
        {ref: "orders", name: "Orders", type: "csv"},
        {ref: "images_zip", name: "Images (ZIP)", type: "zip"},
    ];
    const rowByRef = Object.fromEntries(importRows.map((row) => [row.ref, row]));

    const [checkedItems, setCheckedItems] = useState(
        Object.fromEntries(importRows.map((row) => [row.ref, true]))
    );
    const [filesByRef, setFilesByRef] = useState({});
    const [filePreviewByRef, setFilePreviewByRef] = useState({});
    const [importResultsByRef, setImportResultsByRef] = useState({});
    const [importingByRef, setImportingByRef] = useState({});
    const [delimiterByRef, setDelimiterByRef] = useState(
        Object.fromEntries(importRows.filter((row) => row.type === "csv").map((row) => [row.ref, ","]))
    );
    const [decimalByRef, setDecimalByRef] = useState(
        Object.fromEntries(importRows.filter((row) => row.type === "csv").map((row) => [row.ref, ","]))
    );



    const allChecked = Object.values(checkedItems).every(Boolean);

    function handleCheckAll() {
        setCheckedItems(Object.fromEntries(importRows.map((row) => [row.ref, !allChecked])));
    }

    function buildFilePreview(text, delimiter) {
        const parsed = parseCsvText(text, {delimiter});
        return {
            headers: parsed.meta?.fields ?? [],
            rows: (parsed.data ?? []).slice(0, 5),
            errors: parsed.errors ?? [],
        };
    }

    function handleChangeDelimiter(ref, value) {
        setDelimiterByRef((prev) => ({...prev, [ref]: value}));
        const existingFile = filesByRef[ref];
        if (existingFile?.text) {
            setFilePreviewByRef((prev) => ({
                ...prev,
                [ref]: buildFilePreview(existingFile.text, value),
            }));
        }
    }

    function handleChangeDecimal(ref, value) {
        setDecimalByRef((prev) => ({...prev, [ref]: value}));
    }

    function handleCheckItem(ref) {
        setCheckedItems(prev => ({...prev, [ref]: !prev[ref]}));
    }

    function handleFileLoaded(ref, text, name) {
        setFilesByRef((prev) => ({...prev, [ref]: {text, name}}));
        setFilePreviewByRef((prev) => ({
            ...prev,
            [ref]: buildFilePreview(text, delimiterByRef[ref] ?? ","),
        }));
    }

    function handleZipLoaded(ref, file) {
        setFilesByRef((prev) => ({...prev, [ref]: {file, name: file?.name}}));
        setFilePreviewByRef((prev) => ({...prev, [ref]: null}));
    }

    async function handleImport(ref) {
        const row = rowByRef[ref];
        const fileEntry = filesByRef[ref];

        if (row?.type === "zip") {
            if (!fileEntry?.file) {
                alert("Veuillez charger un fichier ZIP.");
                return;
            }

            try {
                setImportingByRef((prev) => ({...prev, [ref]: true}));
                const result = await importImagesFromZip({
                    zipFile: fileEntry.file,
                    onProgress: (progress) => {
                        setImportResultsByRef((prev) => ({
                            ...prev,
                            [ref]: {
                                ...(prev[ref] ?? {}),
                                progress,
                                type: "zip",
                            },
                        }));
                    },
                });
                setImportResultsByRef((prev) => ({...prev, [ref]: result}));
            } catch (error) {
                setImportResultsByRef((prev) => ({
                    ...prev,
                    [ref]: {ok: false, errors: [{error}], type: "zip"},
                }));
            } finally {
                setImportingByRef((prev) => ({...prev, [ref]: false}));
            }
            return;
        }

        const config = CSV_IMPORT_CONFIGS[ref];

        if (!config) {
            alert("Aucune config CSV pour cette ressource.");
            return;
        }
        if (!fileEntry?.text) {
            alert("Veuillez charger un fichier CSV.");
            return;
        }

        try {
            setImportingByRef((prev) => ({...prev, [ref]: true}));
            const result = await importCsvResource({
                ref,
                csvText: fileEntry.text,
                config,
                delimiter: delimiterByRef[ref] ?? ";",
                decimalSeparator: decimalByRef[ref] ?? ".",
                onProgress: (progress) => {
                    setImportResultsByRef((prev) => ({
                        ...prev,
                        [ref]: {
                            ...(prev[ref] ?? {}),
                            progress,
                        },
                    }));
                },
            });
            setImportResultsByRef((prev) => ({...prev, [ref]: result}));
        } catch (error) {
            setImportResultsByRef((prev) => ({
                ...prev,
                [ref]: {ok: false, errors: [{error}]},
            }));
        } finally {
            setImportingByRef((prev) => ({...prev, [ref]: false}));
        }
    }

    async function handleImportAll() {
        const missing = importRows.filter((row) => checkedItems[row.ref]).filter((row) => {
            const entry = filesByRef[row.ref];
            return row.type === "csv" ? !entry?.text : !entry?.file;
        });

        if (missing.length > 0) {
            alert(`Fichiers manquants: ${missing.map((row) => row.name).join(", ")}`);
            return;
        }

        for (const row of importRows) {
            if (!checkedItems[row.ref]) continue;
            await handleImport(row.ref);
        }
    }


    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Import Csv Database Page</h2>
            <div className="mb-4">
                <button
                    type="button"
                    onClick={handleImportAll}
                    className="rounded bg-blue-600 px-3 py-2 text-white"
                >
                    Import all
                </button>
            </div>
            <div className="mb-4">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Name</th>
                        <th className="py-3 px-6 text-left">Delimiter</th>
                        <th className="py-3 px-6 text-left">Float delimiter</th>
                        <th className="py-3 px-6 text-left">Date Format</th>
                        <th className="py-3 px-6 text-center">
                            Delete
                            <button type="button" onClick={handleCheckAll} className="ml-2 text-xs text-gray-500">
                                {allChecked ? 'Uncheck all' : 'Check all'}
                            </button>
                        </th>
                        <th className="py-3 px-6 text-left">Download Template</th>
                        <th className="py-3 px-6 text-left">File Input</th>

                    </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-medium">
                    {importRows.map((row, i) =>
                        <tr key={i} className="hover:bg-gray-50 transition-all duration-300">
                            <td className="py-3 px-6">{row.name}</td>
                            <td className="py-3 px-6">
                                {row.type === "csv" ? (
                                    <select
                                        name={"delimiter"}
                                        value={delimiterByRef[row.ref]}
                                        onChange={(event) => handleChangeDelimiter(row.ref, event.target.value)}
                                    >
                                        <option value={","}>,</option>
                                        <option value={";"}>;</option>
                                        <option value={"|"}>|</option>
                                    </select>
                                ) : (
                                    <span>-</span>
                                )}
                            </td>
                            <td className="py-3 px-6">
                                {row.type === "csv" ? (
                                    <select
                                        name={"float-delimiter"}
                                        value={decimalByRef[row.ref]}
                                        onChange={(event) => handleChangeDecimal(row.ref, event.target.value)}
                                    >
                                        <option value={"."}>.</option>
                                        <option value={","}>,</option>
                                    </select>
                                ) : (
                                    <span>-</span>
                                )}
                            </td>
                            <td className="py-3 px-6">
                                {row.type === "csv" ? (
                                    <input
                                        className={"border-black border-2 rounded"}
                                        type={"text"}
                                        name={"date-format"}
                                        placeholder={"23-12-2005 23:12:05"}
                                    />
                                ) : (
                                    <span>-</span>
                                )}
                            </td>
                            <td className="py-3 px-6 text-center">
                                <input
                                    type={"checkbox"}
                                    checked={checkedItems[row.ref] ?? false}
                                    onChange={() => handleCheckItem(row.ref)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                            </td>
                            <td>
                                {row.type === "csv" ? (
                                    <CsvTemplateHolder
                                        delimiter={delimiterByRef[row.ref] ?? ";"}
                                        outputName={`${row.ref}_template.csv`}
                                        headers={CSV_IMPORT_CONFIGS[row.ref]?.csvHeaders ?? []}
                                    />
                                ) : (
                                    <div className="text-xs text-gray-500">
                                        Format: reference_name_option.ext
                                    </div>
                                )}
                            </td>
                            <td className="py-3 px-6">
                                {row.type === "csv" ? (
                                    <CsvUploader
                                        onFileLoaded={(text, name) => handleFileLoaded(row.ref, text, name)}
                                    />
                                ) : (
                                    <input
                                        type="file"
                                        accept=".zip,application/zip"
                                        onChange={(event) => handleZipLoaded(row.ref, event.target.files?.[0])}
                                    />
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                    {filesByRef[row.ref]?.name ?? "Aucun fichier"}
                                </div>
                                {row.type === "csv" && filePreviewByRef[row.ref] && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        <div className="font-semibold text-gray-800">Apercu fichier</div>
                                        {filePreviewByRef[row.ref].errors?.length > 0 && (
                                            <div className="text-red-600">
                                                Erreurs parse: {filePreviewByRef[row.ref].errors.length}
                                            </div>
                                        )}
                                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2">
                                            {JSON.stringify(
                                                {
                                                    headers: filePreviewByRef[row.ref].headers,
                                                    rows: filePreviewByRef[row.ref].rows,
                                                },
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleImport(row.ref)}
                                    disabled={importingByRef[row.ref]}
                                    className="mt-2 rounded bg-emerald-500 px-2 py-1 text-white disabled:opacity-60"
                                >
                                    {importingByRef[row.ref]
                                        ? "Import..."
                                        : row.type === "csv"
                                            ? "Import CSV"
                                            : "Import ZIP"}
                                </button>
                                {importResultsByRef[row.ref] && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        {importResultsByRef[row.ref].type === "zip" ? (
                                            <div>
                                                Total: {importResultsByRef[row.ref].total ?? 0} | Importes: {importResultsByRef[row.ref].created?.length ?? 0} | Warnings: {importResultsByRef[row.ref].warnings?.length ?? 0} | Erreurs: {importResultsByRef[row.ref].errors?.length ?? 0}
                                            </div>
                                        ) : importResultsByRef[row.ref].headerErrors?.missing?.length ? (
                                            <div className="text-red-600">
                                                Headers manquants: {importResultsByRef[row.ref].headerErrors.missing.join(", ")}
                                            </div>
                                        ) : (
                                            <div>
                                                Total: {importResultsByRef[row.ref].total ?? 0} | Crees: {importResultsByRef[row.ref].created?.length ?? 0} | Erreurs: {importResultsByRef[row.ref].errors?.length ?? 0}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ImportDatabase;
