export const TAX_RULES_CACHE = new Map();
export const TAX_RULE_CROUPS_CACHE = new Map();
export const TAXES_CACHE = new Map();
export const CATEGORIES_CACHE = new Map();
export const PRODUCTS_CACHE = new Map();

export const PRODUCT_COMBINATIONS_CACHE = new Map();
export const PRODUCT_OPTIONS_CACHE = new Map();
export const CUSTOMERS_CACHE = new Map();
export const ADDRESSES_CACHE = new Map();



export function clearAllCaches() {
    console.log("Clearing all caches");
    TAX_RULES_CACHE.clear();
    TAX_RULE_CROUPS_CACHE.clear();
    TAXES_CACHE.clear();
    CATEGORIES_CACHE.clear();
    PRODUCTS_CACHE.clear();
    PRODUCT_COMBINATIONS_CACHE.clear();
    PRODUCT_OPTIONS_CACHE.clear();
    CUSTOMERS_CACHE.clear();

    console.log("All cache cleared");
}
