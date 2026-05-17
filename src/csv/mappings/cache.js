/**
 * cache.js
 *
 * Module-level Map caches for all PrestaShop resource lookups.
 * Each cache lives for the lifetime of the browser session and is shared
 * across all three CSV import pipelines (products, combinations, orders)
 * and the image ZIP importer.
 *
 * Call clearAllCaches() before starting a fresh import (e.g. on DB reset)
 * to avoid stale hits from a previous run.
 *
 * All caches store FULL OBJECTS (not just ids) so any field can be read
 * from the cache without an extra API round-trip.
 * Exceptions are noted per-cache below.
 */


/**
 * PRODUCTS_CACHE
 *
 * Key   : product reference string (e.g. "T_01")
 *         → trimmed, case-sensitive, exactly as it appears in the CSV / API
 * Value : full PrestaShop product object as returned by GET /products?filters[reference]=...
 *         Useful fields: id, name (language nodes), price (HT string),
 *         wholesale_price, id_tax_rules_group, reference, associations, ...
 *
 * Populated by : findProductByReference()
 * Used by      : csvProductCombinationMapping, csvOrderMapping, imageMappingZip
 */
export const PRODUCTS_CACHE = new Map();


/**
 * CATEGORIES_CACHE
 *
 * Key   : category name string, trimmed but NOT lowercased
 *         (e.g. "Électronique") — matches the value passed to ensureCategory()
 * Value : full PrestaShop category object as returned by GET /categories?filters[name]=...
 *         Useful fields: id, name (language nodes), id_parent, active, link_rewrite
 *
 * Populated by : ensureCategory()  (on both find and create)
 * Used by      : csvProductMapping
 */
export const CATEGORIES_CACHE = new Map();


/**
 * TAXES_CACHE
 *
 * Key   : tax rate as a plain number string (e.g. "11.65", "5.6", "20")
 *         → result of String(parseFloat(rate)), so trailing zeros are normalised
 * Value : full PrestaShop tax object as returned by GET /taxes?filters[rate]=...
 *         Useful fields: id, rate, name (language nodes), active
 *
 * Populated by : ensureTaxRuleGroup()  (on both find and create)
 * Used by      : ensureTaxRuleGroup(), getTaxRateForGroup()
 */
export const TAXES_CACHE = new Map();


/**
 * TAX_RULES_CACHE
 *
 * Key   : taxId string (the id of the linked `tax` record, e.g. "3")
 * Value : full PrestaShop tax_rule object as returned by GET /tax_rules?filters[id_tax]=...
 *         Useful fields: id, id_tax_rules_group, id_country, id_tax, description
 *
 * Populated by : ensureTaxRuleGroup()  (on both find and create)
 *                getTaxRateForGroup()  (when it fetches the rule to find the tax)
 * Used by      : ensureTaxRuleGroup()  (to skip creating a duplicate tax_rule_group)
 */
export const TAX_RULES_CACHE = new Map();


/**
 * TAX_RULE_GROUPS_CACHE
 *
 * Key   : tax_rules_group id string (e.g. "2")
 * Value : plain object  { id: string, rate: number }
 *         — NOT the full API object; only the two fields needed for price calculation
 *         Example: { id: "2", rate: 11.65 }
 *
 * Populated by : ensureTaxRuleGroup()  (after find or create)
 *                getTaxRateForGroup()  (after resolving the rate from the API)
 * Used by      : getTaxRateForGroup()  (primary cache-check point)
 *                csvProductCombinationMapping, csvOrderMapping  (via getTaxRateForGroup)
 */
export const TAX_RULE_GROUPS_CACHE = new Map();


/**
 * PRODUCT_OPTIONS_CACHE
 *
 * Key   : option (attribute group) name, lowercased and trimmed
 *         (e.g. "couleur", "taille")
 * Value : full PrestaShop product_option object as returned by GET /product_options (full list)
 *         Useful fields: id, name (language nodes), public_name, group_type, is_color_group
 *
 * Populated by : ensureProductOption()  (on both find and create)
 * Used by      : csvProductCombinationMapping
 */
export const PRODUCT_OPTIONS_CACHE = new Map();


/**
 * OPTION_VALUES_CACHE
 *
 * Key   : composite string  "{groupId}::{normalizedName}"
 *         where groupId is the product_option id string (e.g. "3")
 *         and normalizedName is the option value name, lowercased and trimmed
 *         Example key: "3::rouge"
 * Value : full PrestaShop product_option_value object
 *         Useful fields: id, id_attribute_group, name (language nodes), position
 *
 * Populated by : ensureProductOptionValue()  (on both find and create)
 *                getOptionValueNameMap()      (warms entries while building the id→name map)
 * Used by      : csvProductCombinationMapping, resolveCombinationId (via getOptionValueNameMap)
 */
export const OPTION_VALUES_CACHE = new Map();


/**
 * COMBINATIONS_CACHE
 *
 * Key   : productId string (e.g. "12")
 * Value : array of full PrestaShop combination objects for that product
 *         Each item contains: id, id_product, price (delta HT), minimal_quantity,
 *         associations.product_option_values.product_option_value (array of { id })
 *
 * Populated by : getProductCombinations()
 * Invalidated  : csvProductCombinationMapping deletes the key after creating a new
 *                combination so the order importer sees the updated list
 * Used by      : resolveCombinationId(), csvOrderMapping (combo delta price lookup)
 */
export const COMBINATIONS_CACHE = new Map();


/**
 * ORDER_STATES_CACHE
 *
 * Key   : order state name, normalised (diacritics stripped, lowercased, trimmed)
 *         (e.g. "livre", "en cours de preparation")
 * Value : full PrestaShop order_state object as returned by GET /order_states (full list)
 *         Useful fields: id, name (language nodes), color, paid, shipped, ...
 *
 * Populated by : ensureOrderState()  (on both find and create)
 * Used by      : csvOrderMapping
 */
export const ORDER_STATES_CACHE = new Map();


/**
 * CUSTOMERS_CACHE
 *
 * Key   : customer email string, lowercased and trimmed
 *         (e.g. "jean.dupont@example.com")
 * Value : full PrestaShop customer object as returned by GET /customers?filters[email]=...
 *         Useful fields: id, email, firstname, lastname, id_default_group, active, ...
 *
 * Populated by : getCustomerByEmail()   (on API hit)
 *                cacheCustomer()        (called after createResource("customers", ...))
 * Used by      : csvOrderMapping  (ensureCustomer, ensureCustomerAnonym)
 */
export const CUSTOMERS_CACHE = new Map();


/**
 * ADDRESSES_CACHE
 *
 * Key   : customerId string (e.g. "7")
 * Value : addressId string — the id of the customer's first address (e.g. "4")
 *         NOTE: scalar string, not a full object (only the id is ever needed)
 *
 * Populated by : getCustomerAddressId()  (on API hit)
 *                cacheAddress()          (called after createResource("addresses", ...))
 * Used by      : csvOrderMapping  (ensureCustomerAddress)
 */
export const ADDRESSES_CACHE = new Map();


/**
 * CURRENCIES_CACHE
 *
 * Key   : the literal string "first"  (only the first currency is ever needed)
 * Value : currency id string (e.g. "1")
 *         NOTE: scalar string, not a full object
 *
 * Populated by : getFirstCurrencyId()  →  getFirstId("currencies", CURRENCIES_CACHE)
 * Used by      : csvOrderMapping  (cart and order creation)
 */
export const CURRENCIES_CACHE = new Map();


/**
 * CARRIERS_CACHE
 *
 * Key   : the literal string "first"  (only the first carrier is ever needed)
 * Value : carrier id string (e.g. "1")
 *         NOTE: scalar string, not a full object
 *
 * Populated by : getFirstCarrierId()  →  getFirstId("carriers", CARRIERS_CACHE)
 * Used by      : csvOrderMapping  (cart and order creation)
 */
export const CARRIERS_CACHE = new Map();


/**
 * STOCK_MVT_REASON_CACHE
 *
 * Key   : stock movement reason name string, trimmed
 *         (e.g. "Import data stock !")
 * Value : reasonId string — the id of the created/found stock_movement_reason (e.g. "11")
 *         NOTE: scalar string, not a full object
 *
 * Populated by : ensureStockMvtReason()  (after createResource("stock_movement_reasons", ...))
 * Used by      : createStockMvt()  (called by patchStockAvailable)
 */
export const STOCK_MVT_REASON_CACHE = new Map();


// ─── Cache management ─────────────────────────────────────────────────────────

export function clearAllCaches() {
    console.log("Clearing all caches...");
    PRODUCTS_CACHE.clear();
    CATEGORIES_CACHE.clear();
    TAXES_CACHE.clear();
    TAX_RULES_CACHE.clear();
    TAX_RULE_GROUPS_CACHE.clear();
    PRODUCT_OPTIONS_CACHE.clear();
    OPTION_VALUES_CACHE.clear();
    COMBINATIONS_CACHE.clear();
    ORDER_STATES_CACHE.clear();
    CUSTOMERS_CACHE.clear();
    ADDRESSES_CACHE.clear();
    CURRENCIES_CACHE.clear();
    CARRIERS_CACHE.clear();
    STOCK_MVT_REASON_CACHE.clear();
    console.log("All caches cleared.");
}