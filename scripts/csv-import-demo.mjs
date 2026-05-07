import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CSV_IMPORT_CONFIGS } from "../src/csv/csvImportConfig.js";
import { parseCsvText } from "../src/csv/csvImportUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, "../csv_import/products_import.csv");
const csvText = fs.readFileSync(csvPath, "utf8");

const config = CSV_IMPORT_CONFIGS.products;
const parsed = parseCsvText(csvText, { delimiter: ";" });

const firstRow = parsed.data?.[0];
if (!firstRow) {
  console.error("No rows parsed from CSV.");
  process.exit(1);
}

const payload = config.mapRowToPayload(firstRow, {
  languageIds: config.languageIds,
  decimalSeparator: ".",
  defaultCategoryId: config.defaultCategoryId,
});

console.log("First row payload preview:");
console.log(JSON.stringify(payload, null, 2));

