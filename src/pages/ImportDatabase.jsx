import React, {useState} from 'react';
import {API_URLS} from "../constants/apiData.js";
import {getList} from "../api/prestashopCrud.js";
import CsvUploader from "../csv/CsvUploader.jsx";
import CsvTemplateHolder from "../csv/CsvTemplateHolder.jsx";
import {CSV_IMPORT_CONFIGS} from "../csv/csvImportConfig.js";
import {importCsvResource} from "../csv/csvImporter.js";

function ImportDatabase(props) {
    const [checkedItems, setCheckedItems] = useState(
        Object.fromEntries(API_URLS.map(api => [api.ref, api.deletable !== false]))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewResults, setPreviewResults] = useState([]);
    const [previewError, setPreviewError] = useState(null);
    const [filesByRef, setFilesByRef] = useState({});
    const [importResultsByRef, setImportResultsByRef] = useState({});
    const [importingByRef, setImportingByRef] = useState({});
    const [delimiterByRef, setDelimiterByRef] = useState(
        Object.fromEntries(API_URLS.map((api) => [api.ref, ";"]))
    );
    const [decimalByRef, setDecimalByRef] = useState(
        Object.fromEntries(API_URLS.map((api) => [api.ref, "."]))
    );

    const allChecked = Object.values(checkedItems).every(Boolean);

    function handleCheckAll() {
        setCheckedItems(Object.fromEntries(API_URLS.map(api => [api.ref, !allChecked])));
    }

    function handleChangeDelimiter(ref, value) {
        setDelimiterByRef((prev) => ({...prev, [ref]: value}));
    }

    function handleChangeDecimal(ref, value) {
        setDecimalByRef((prev) => ({...prev, [ref]: value}));
    }

    function handleCheckItem(ref) {
        setCheckedItems(prev => ({...prev, [ref]: !prev[ref]}));
    }

    function handleFileLoaded(ref, text, name) {
        setFilesByRef((prev) => ({...prev, [ref]: {text, name}}));
    }

    async function handleImport(ref) {
        const config = CSV_IMPORT_CONFIGS[ref];
        const fileEntry = filesByRef[ref];

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

    async function handlePreviewSubmit(e) {
        e.preventDefault();
        const refs = Object.keys(checkedItems).filter(ref => checkedItems[ref]);
        if (refs.length === 0) {
            alert("Aucune ressource selectionnee.");
            return;
        }

        try {
            setIsSubmitting(true);
            setPreviewError(null);
            setPreviewResults([]);

            const results = await Promise.all(
                refs.map(async (ref) => {
                    try {
                        const response = await getList(ref, {limit: "0,5"});
                        return {ref, ok: true, data: response?.data ?? null};
                    } catch (error) {
                        return {ref, ok: false, error};
                    }
                })
            );

            setPreviewResults(results);
        } catch (error) {
            console.error(error);
            setPreviewError(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Import Csv Database Page</h2>
            <form onSubmit={handlePreviewSubmit} className="mb-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                    {isSubmitting ? "Chargement..." : "Charger donnees"}
                </button>
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
                    {API_URLS.map((api, i) =>
                        <tr key={i} className="hover:bg-gray-50 transition-all duration-300">
                            <td className="py-3 px-6">{api.name}</td>
                            <td className="py-3 px-6">
                                <select
                                    name={"delimiter"}
                                    value={delimiterByRef[api.ref]}
                                    onChange={(event) => handleChangeDelimiter(api.ref, event.target.value)}
                                >
                                    <option value={","}>,</option>
                                    <option value={";"}>;</option>
                                    <option value={"|"}>|</option>
                                </select>
                            </td>
                            <td className="py-3 px-6">
                                <select
                                    name={"float-delimiter"}
                                    value={decimalByRef[api.ref]}
                                    onChange={(event) => handleChangeDecimal(api.ref, event.target.value)}
                                >
                                    <option value={"."}>.</option>
                                    <option value={","}>,</option>
                                </select>
                            </td>
                            <td className="py-3 px-6">
                                <input className={"border-black border-2 rounded"} type={"text"} name={"date-format"}
                                       placeholder={"23-12-2005 23:12:05"}/>
                            </td>
                            <td className="py-3 px-6 text-center">
                                <input
                                    type={"checkbox"}
                                    checked={checkedItems[api.ref] ?? false}
                                    onChange={() => handleCheckItem(api.ref)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                            </td>
                            <td>
                                <CsvTemplateHolder
                                    delimiter={delimiterByRef[api.ref] ?? ";"}
                                    outputName={`${api.ref}_template.csv`}
                                    headers={api.csvHeaders ?? []}
                                />
                            </td>
                            <td className="py-3 px-6">
                                <CsvUploader onFileLoaded={(text, name) => handleFileLoaded(api.ref, text, name)}/>
                                <div className="text-xs text-gray-500 mt-1">
                                    {filesByRef[api.ref]?.name ?? "Aucun fichier"}
                                </div>
                                {CSV_IMPORT_CONFIGS[api.ref] && (
                                    <button
                                        type="button"
                                        onClick={() =>  handleImport(api.ref)}
                                        disabled={importingByRef[api.ref]}
                                        className="mt-2 rounded bg-emerald-500 px-2 py-1 text-white disabled:opacity-60"
                                    >
                                        {importingByRef[api.ref] ? "Import..." : "Import CSV"}
                                    </button>
                                )}
                                {importResultsByRef[api.ref] && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        {importResultsByRef[api.ref].headerErrors?.missing?.length ? (
                                            <div className="text-red-600">
                                                Headers manquants: {importResultsByRef[api.ref].headerErrors.missing.join(", ")}
                                            </div>
                                        ) : (
                                            <div>
                                                Total: {importResultsByRef[api.ref].total ?? 0} | Crees: {importResultsByRef[api.ref].created?.length ?? 0} | Erreurs: {importResultsByRef[api.ref].errors?.length ?? 0}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </form>
            {previewError && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Erreur lors du chargement des donnees: {previewError.message}
                </div>
            )}
            {previewResults.length > 0 && (
                <div className="rounded border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900">Apercu des donnees</h3>
                    <div className="mt-3 space-y-4 text-sm text-gray-700">
                        {previewResults.map((item) => (
                            <div key={item.ref} className="rounded border border-gray-100 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-gray-900">{item.ref}</span>
                                    {item.ok ? (
                                        <span className="text-green-700">OK</span>
                                    ) : (
                                        <span className="text-red-600">Erreur</span>
                                    )}
                                </div>
                                {item.ok ? (
                                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
                                        {JSON.stringify(item.data, null, 2)}
                                    </pre>
                                ) : (
                                    <div className="mt-2 text-xs text-red-700">
                                        {item.error?.message ?? "Erreur inconnue"}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ImportDatabase;

