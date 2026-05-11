import {createResource} from "../api/prestashopCrud.js";
import {parseCsvText, validateCsvHeaders} from "./csvImportUtils.js";


export async function importCsvResource({
                                            ref,
                                            csvText,
                                            config,
                                            delimiter,
                                            decimalSeparator,
                                            onProgress,
                                            signal,
                                        }) {
    if (!config) {
        throw new Error(`Missing CSV import config for ${ref}`);
    }

    const parseResult = parseCsvText(csvText, {delimiter});
    const headers = parseResult.meta?.fields ?? [];
    const headerErrors = validateCsvHeaders(headers, config.csvHeaders);

    const rows = parseResult.data ?? [];
    const created = [];
    const errors = [];
    const stopOnError = config.stopOnError === true;

    for (let index = 0; index < rows.length; index += 1) {
        if (signal?.aborted) break;

        const row = rows[index];
        try {
            let result;

            if (typeof config.processRow === "function") {
                result = await config.processRow(row, {
                    languageIds: config.languageIds,
                    decimalSeparator,
                    defaultCategoryId: config.defaultCategoryId,
                    multipleValueSeparator: "/",
                });
            } else {
                const payload = await config.mapRowToPayload(row, {
                    languageIds: config.languageIds,
                    decimalSeparator,
                    defaultCategoryId: config.defaultCategoryId,
                    multipleValueSeparator: "/",
                });

                if (!payload) {
                    onProgress?.({index, total: rows.length, status: "skipped"});
                    continue;
                }

                const response = await createResource(ref, payload, {signal});
                result = {response};

                if (typeof config.onAfterCreate === "function") {
                    await config.onAfterCreate({row, response, decimalSeparator});
                }
            }

            const createdId = result?.id ?? result?.response?.data?.[ref.slice(0, -1)]?.id ?? null;
            created.push({index, id: createdId});
            onProgress?.({index, total: rows.length, status: "created"});
        } catch (error) {
            console.log(error);
            errors.push({index, error, row});
            onProgress?.({index, total: rows.length, status: "error", error});
            if (stopOnError) break;
        }
    }

    return {
        ok: errors.length === 0,
        headerErrors,
        parseErrors: parseResult.errors ?? [],
        created,
        errors,
        total: rows.length,
    };
}

