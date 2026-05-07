import Papa from "papaparse";

export function parseCsvText(text, options = {}) {
  const delimiter = options.delimiter ?? ";";
  const result = Papa.parse(text ?? "", {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: (header) => header.trim(),
  });

  return result;
}

export function validateCsvHeaders(actualHeaders, expectedHeaders) {
  const actual = new Set((actualHeaders ?? []).map((header) => header.trim()));
  const expected = new Set((expectedHeaders ?? []).map((header) => header.trim()));

  const missing = [];
  // for (const header of expected) {
  //   if (!actual.has(header)) missing.push(header);
  // }

  return { missing };
}

export function parseCsvBoolean(value, defaultValue = "0") {
  if (value === null || value === undefined || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return "1";
  if (["0", "false", "no", "n"].includes(normalized)) return "0";
  return defaultValue;
}

export function parseCsvNumber(value, options = {}) {
  if (value === null || value === undefined || value === "") return "";
  const decimalSeparator = options.decimalSeparator ?? ".";
  let normalized = String(value).trim();
  if (decimalSeparator === ",") {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const asNumber = Number(normalized);
  if (Number.isNaN(asNumber)) return "";
  return String(asNumber);
}

export function parseCsvList(value, options = {}) {
  if (!value) return [];
  const delimiter = options.delimiter ?? ",";
  return String(value)
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugify(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toLanguageNodes(text, languageIds) {
  const safeText = text ?? "";
  const ids = languageIds?.length ? languageIds : ["1"];
  return {
    language: ids.map((id) => ({ "@_id": String(id), "__cdata": String(safeText) })),
  };
}

export function isNumericString(value) {
  if (value === null || value === undefined || value === "") return false;
  return /^\d+$/.test(String(value).trim());
}

export function cleanEmptyFields(payload) {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => cleanEmptyFields(item))
      .filter((item) => item !== undefined);
  }

  if (payload && typeof payload === "object") {
    const next = {};
    for (const [key, value] of Object.entries(payload)) {
      const cleaned = cleanEmptyFields(value);
      if (cleaned === undefined) continue;
      if (cleaned === "") continue;
      if (Array.isArray(cleaned) && cleaned.length === 0) continue;
      if (typeof cleaned === "object" && Object.keys(cleaned).length === 0) continue;
      next[key] = cleaned;
    }
    return next;
  }

  return payload === undefined || payload === null ? undefined : payload;
}

