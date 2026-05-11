import {CUSTOMERS_CSV_HEADERS, PRODUCTS_CSV_HEADERS, ORDERS_CSV_HEADERS, COMBINATIONS_CSV_HEADERS} from "./csvHeaders.js";
import {mapProductRowToPayload} from "./mappings/csvProductMapping.js";
import {mapCustomerRowToPayload} from "./mappings/csvCustomerMapping.js";
import {processOrderRow} from "./mappings/csvOrderMapping.js";
import {processCombinationRow} from "./mappings/csvProductCombinationMapping.js";

export const CSV_IMPORT_CONFIGS = {
    products: {
        ref: "products",
        csvHeaders: PRODUCTS_CSV_HEADERS,
        mapRowToPayload: mapProductRowToPayload,
        languageIds: ["1"],
        defaultCategoryId: "1",
        stopOnError: true,
    },
    combinations: {
        ref: "combinations",
        csvHeaders: COMBINATIONS_CSV_HEADERS,
        processRow: processCombinationRow,
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
        languageIds: ["1"],
        defaultCategoryId: "1",
        stopOnError: true,
    },
};
