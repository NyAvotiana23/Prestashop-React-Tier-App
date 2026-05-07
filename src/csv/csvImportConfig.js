import {CUSTOMERS_CSV_HEADERS, PRODUCTS_CSV_HEADERS} from "./csvHeaders.js";
import {mapProductRowToPayload} from "./mappings/csvProductMapping.js";
import {mapCustomerRowToPayload} from "./mappings/csvCustomerMapping.js";

export const CSV_IMPORT_CONFIGS = {
    products: {
        ref: "products",
        csvHeaders: PRODUCTS_CSV_HEADERS,
        mapRowToPayload: mapProductRowToPayload,
        languageIds: ["1"],
        defaultCategoryId: "1",
    },
    customers: {
        ref: "customers",
        csvHeaders: CUSTOMERS_CSV_HEADERS,
        mapRowToPayload: mapCustomerRowToPayload,
        languageIds: ["1"],
        defaultCategoryId: "1",
    },
};

