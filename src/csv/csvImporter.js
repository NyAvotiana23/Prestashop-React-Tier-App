import { createResource } from "../api/prestashopCrud.js";
import { parseCsvText, validateCsvHeaders } from "./csvImportUtils.js";

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

  const parseResult = parseCsvText(csvText, { delimiter });
  const headers = parseResult.meta?.fields ?? [];
  const headerErrors = validateCsvHeaders(headers, config.csvHeaders);
  //
  // if (headerErrors.missing.length > 0) {
  //   return {
  //     ok: false,
  //     headerErrors,
  //     parseErrors: parseResult.errors ?? [],
  //     created: [],
  //     errors: [],
  //     total: 0,
  //   };
  // }

  const rows = parseResult.data ?? [];
  const created = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    if (signal?.aborted) break;

    const row = rows[index];
    try {
      const payload = config.mapRowToPayload(row, {
        languageIds: config.languageIds,
        decimalSeparator,
        defaultCategoryId: config.defaultCategoryId,
      });
      const response = await createResource(ref, payload, { signal });
      created.push({ index, id: response?.data?.product?.id ?? null });
      onProgress?.({ index, total: rows.length, status: "created" });
    } catch (error) {
      errors.push({ index, error, row });
      onProgress?.({ index, total: rows.length, status: "error", error });
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

