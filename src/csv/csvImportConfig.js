import { PRODUCTS_CSV_HEADERS } from "./csvHeaders.js";
import { mapProductRowToPayload } from "./csvProductMapping.js";

export const CSV_IMPORT_CONFIGS = {
  products: {
    ref: "products",
    csvHeaders: PRODUCTS_CSV_HEADERS,
    mapRowToPayload: mapProductRowToPayload,
    languageIds: ["1"],
    defaultCategoryId: "1",
  },
};

