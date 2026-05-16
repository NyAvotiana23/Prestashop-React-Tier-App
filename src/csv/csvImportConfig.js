import {CUSTOMERS_CSV_HEADERS, PRODUCTS_CSV_HEADERS, ORDERS_CSV_HEADERS, COMBINATIONS_CSV_HEADERS} from "./csvHeaders.js";
import {mapProductRowToPayload, validateProductRow} from "./mappings/csvProductMapping.js";
import {mapCustomerRowToPayload} from "./mappings/csvCustomerMapping.js";
import {processOrderRow, validateOrderRow} from "./mappings/csvOrderMapping.js";
import {processCombinationRow, validateCombinationRow} from "./mappings/csvProductCombinationMapping.js";

export const CSV_IMPORT_CONFIGS = {
    products: {
        ref: "products",
        csvHeaders: PRODUCTS_CSV_HEADERS,
        mapRowToPayload: mapProductRowToPayload,
        validateRow: validateProductRow,
        languageIds: ["1"],
        defaultCategoryId: "1",
        stopOnError: true,
    },
    combinations: {
        ref: "combinations",
        csvHeaders: COMBINATIONS_CSV_HEADERS,
        processRow: processCombinationRow,
        validateRow: validateCombinationRow,
        stopOnError: true,
    },
    customers: {
        ref: "customers",
        csvHeaders: CUSTOMERS_CSV_HEADERS,
        mapRowToPayload: mapCustomerRowToPayload,
        languageIds: ["1"],
        defaultCategoryId: "1",
    },
    orders: {
        ref: "orders",
        csvHeaders: ORDERS_CSV_HEADERS,
        processRow: processOrderRow,
        validateRow: validateOrderRow,
        languageIds: ["1"],
        defaultCategoryId: "1",
        stopOnError: true,
    },
};
