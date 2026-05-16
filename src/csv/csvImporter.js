import {createResource} from "../api/prestashopCrud.js";
import {parseCsvText, validateCsvHeaders} from "./csvImportUtils.js";
import {ensureArray} from "../utils/util-functions.js";

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
    const skipped = [];
    const warnings = [];
    const errors = [];
    const report = [];
    const stopOnError = config.stopOnError === true;

    for (let index = 0; index < rows.length; index += 1) {
        if (signal?.aborted) break;

        const row = rows[index];

        const validationErrors =
            typeof config.validateRow === "function"
                ? ensureArray(config.validateRow(row)).filter(Boolean)
                : [];
        if (validationErrors.length > 0) {
            const reason = validationErrors.join(" | ");
            const error = new Error(reason);
            errors.push({index, error, message: reason, row, validationErrors});
            report.push({index, status: "error", reason, validationErrors});
            onProgress?.({index, total: rows.length, status: "error", error: reason});
            if (stopOnError) break;
            continue;
        }

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
                    const reason = "Payload vide";
                    skipped.push({index, reason});
                    report.push({index, status: "skipped", reason});
                    onProgress?.({index, total: rows.length, status: "skipped", reason});
                    continue;
                }

                const response = await createResource(ref, payload, {signal});
                result = {response};

                if (typeof config.onAfterCreate === "function") {
                    await config.onAfterCreate({row, response, decimalSeparator});
                }
            }

            if (result?.status === "skipped" || result?.skipped === true) {
                const reason = result?.reason ?? "Ligne ignoree par le mapping";
                skipped.push({index, reason, details: result?.details});
                report.push({index, status: "skipped", reason, details: result?.details});
                onProgress?.({index, total: rows.length, status: "skipped", reason});
                continue;
            }

            const createdId = result?.id ?? result?.response?.data?.[ref.slice(0, -1)]?.id ?? null;
            if (createdId) {
                created.push({index, id: createdId, details: result?.details});
                report.push({index, status: "created", id: createdId, details: result?.details});
                onProgress?.({index, total: rows.length, status: "created", id: createdId});
                continue;
            }

            const warning = "Aucun identifiant retourne par l'API";
            warnings.push({index, warning, details: result?.details});
            report.push({index, status: "warning", reason: warning, details: result?.details});
            onProgress?.({index, total: rows.length, status: "warning", reason: warning});
        } catch (error) {
            const message = error?.message ?? String(error);
            errors.push({index, error, message, row});
            report.push({index, status: "error", reason: message});
            onProgress?.({index, total: rows.length, status: "error", error: message});
            if (stopOnError) break;
        }
    }

    return {
        ok: errors.length === 0,
        headerErrors,
        parseErrors: parseResult.errors ?? [],
        created,
        skipped,
        warnings,
        errors,
        report,
        total: rows.length,
    };
}
