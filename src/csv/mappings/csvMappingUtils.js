/**
 * csvMappingUtils.js
 *
 * Central hub for ALL shared lookup / ensure / create helpers used across
 * the three CSV import pipelines (products, combinations, orders) and the
 * image ZIP importer.
 *
 * Rules:
 *  - Every public function checks its cache FIRST, returns the cached full
 *    object (or scalar) when available, and only hits the API on a miss.
 *  - After a successful API call the result is always stored in the cache.
 *  - No row-validation or row-mapping logic lives here; that belongs in the
 *    individual mapping files.
 */

import { createResource, getList, patchResource } from "../../api/prestashopCrud.js";
import { parseCsvNumber, slugify, toLanguageNodes }  from "../csvImportUtils.js";
import { ensureArray, getLanguageText, getScalarValue, normalizeText } from "../../utils/util-functions.js";
import {
    PRODUCTS_CACHE,
    CATEGORIES_CACHE,
    TAXES_CACHE,
    TAX_RULES_CACHE,
    TAX_RULE_GROUPS_CACHE,
    PRODUCT_OPTIONS_CACHE,
    OPTION_VALUES_CACHE,
    COMBINATIONS_CACHE,
    ORDER_STATES_CACHE,
    CUSTOMERS_CACHE,
    ADDRESSES_CACHE,
    CURRENCIES_CACHE,
    CARRIERS_CACHE,
    STOCK_MVT_REASON_CACHE,
} from "./cache.js";

// ─── Shared defaults ──────────────────────────────────────────────────────────

export const DEFAULT_LANG_ID          = "1";
export const DEFAULT_PARENT_CATEGORY  = "1";
export const DEFAULT_COUNTRY_ID       = "8";
export const DEFAULT_SHOP_ID          = "1";
export const DEFAULT_EMPLOYEE_ID      = "1";
export const DEFAULT_MANUFACTURER_ID  = "1";
export const DEFAULT_SUPPLIER_ID      = "1";
export const DEFAULT_MINIMAL_QUANTITY = "1";
export const DEFAULT_SHOW_PRICE       = "1";
export const DEFAULT_STATE_COLOR      = "#eeff00";
export const DEFAULT_ANONYM_GROUP     = "1";
export const DEFAULT_CITY_NAME        = "France";
export const DEFAULT_POST_CODE        = "00111";

// ─── Generic list helpers ─────────────────────────────────────────────────────

/** Fetches a full list of a resource (up to 1 000 items). */
export async function listAll(ref) {
    const response = await getList(ref, { display: "full", limit: "0,1000" });
    const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    return ensureArray(node);
}

/** Returns the id of the very first record in a resource. */
export async function getFirstId(ref, cache) {
    const cacheKey = "first";
    if (cache?.has(cacheKey)) return cache.get(cacheKey);

    const response = await getList(ref, { display: "[id]", limit: "0,1" });
    const node  = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    const items = ensureArray(node);
    const id    = getScalarValue(items[0]?.id || items[0]?.["@_id"]);

    if (id && cache) cache.set(cacheKey, id);
    return id;
}

export async function getFirstCurrencyId() {
    return getFirstId("currencies", CURRENCIES_CACHE);
}

export async function getFirstCarrierId() {
    return getFirstId("carriers", CARRIERS_CACHE);
}

// ─── Products ─────────────────────────────────────────────────────────────────

/**
 * Finds a product by its reference field.
 * Cache key: reference string → full product object.
 */
export async function findProductByReference(reference) {
    const key = String(reference ?? "").trim();
    if (!key) return null;
    if (PRODUCTS_CACHE.has(key)) return PRODUCTS_CACHE.get(key);

    const response = await getList("products", {
        display: "full",
        filters: { reference: key },
        limit:   "0,5",
    });
    const items = ensureArray(response?.data?.products?.product ?? []);
    const product = items.length > 0 ? items[0] : null;

    if (product) PRODUCTS_CACHE.set(key, product);
    return product;
}

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * Finds or creates a category by name.
 * Cache key: normalizedName → full category object.
 * Returns the category id string.
 */
export async function ensureCategory(name) {
    const normalizedName = String(name ?? "").trim();
    if (!normalizedName) return "";

    if (CATEGORIES_CACHE.has(normalizedName)) {
        return getScalarValue(CATEGORIES_CACHE.get(normalizedName)?.id);
    }

    const listResponse = await getList("categories", {
        display: "full",
        sort:    "[id_ASC]",
        filters: { name: normalizedName },
    });
    const existing = ensureArray(listResponse?.data?.categories?.category ?? []);

    if (existing.length > 0) {
        CATEGORIES_CACHE.set(normalizedName, existing[0]);
        return getScalarValue(existing[0]?.id);
    }

    const payload = {
        category: {
            id_parent:    DEFAULT_PARENT_CATEGORY,
            active:       "1",
            name:         toLanguageNodes(normalizedName, [DEFAULT_LANG_ID]),
            link_rewrite: toLanguageNodes(slugify(normalizedName), [DEFAULT_LANG_ID]),
        },
    };
    const created = await createResource("categories", payload);
    const categoryObj = created?.data?.category;
    if (categoryObj) CATEGORIES_CACHE.set(normalizedName, categoryObj);
    return getScalarValue(categoryObj?.id);
}

// ─── Taxes & tax rule groups ──────────────────────────────────────────────────

/**
 * Finds or creates a tax + tax_rule_group for a given rate (e.g. 11.65).
 * Cache key (TAX_RULE_GROUPS_CACHE): taxRulesGroupId → { id, rate }
 * Returns the tax_rule_group id string.
 */
export async function ensureTaxRuleGroup(rate) {
    const rateNum = parseFloat(rate);
    if (!rate || isNaN(rateNum)) return "";
    const rateStr = String(rateNum);

    // Check tax cache first
    let taxId = "";
    if (TAXES_CACHE.has(rateStr)) {
        taxId = getScalarValue(TAXES_CACHE.get(rateStr)?.id);
    } else {
        const taxListResponse = await getList("taxes", {
            display: "full",
            filters: { rate: rateStr },
            limit:   "0,5",
        });
        const taxItems    = ensureArray(taxListResponse?.data?.taxes?.tax ?? []);
        const existingTax = taxItems[0];

        if (existingTax) {
            TAXES_CACHE.set(rateStr, existingTax);
            taxId = getScalarValue(existingTax?.id);
        } else {
            const taxPayload = {
                tax: {
                    rate:    rateStr,
                    active:  "1",
                    deleted: "0",
                    name:    toLanguageNodes(`Taxe ${rateStr}%`, [DEFAULT_LANG_ID]),
                },
            };
            const taxResponse = await createResource("taxes", taxPayload);
            const taxObj      = taxResponse?.data?.tax;
            if (taxObj) {
                TAXES_CACHE.set(rateStr, taxObj);
                taxId = getScalarValue(taxObj?.id);
            }
        }
    }

    if (!taxId) return "";

    // Check tax_rule
    let taxRuleGroupId = "";
    if (TAX_RULES_CACHE.has(taxId)) {
        taxRuleGroupId = getScalarValue(TAX_RULES_CACHE.get(taxId)?.id_tax_rules_group);
    } else {
        const taxRuleResponse = await getList("tax_rules", {
            display: "full",
            filters: { id_tax: String(taxId) },
            limit:   "0,5",
        });
        const taxRuleItems    = ensureArray(taxRuleResponse?.data?.tax_rules?.tax_rule ?? []);
        const existingTaxRule = taxRuleItems[0];

        if (existingTaxRule) {
            TAX_RULES_CACHE.set(taxId, existingTaxRule);
            taxRuleGroupId = getScalarValue(existingTaxRule?.id_tax_rules_group);
        }
    }

    if (taxRuleGroupId) {
        // Populate TAX_RULE_GROUPS_CACHE so getTaxRateForGroup is cache-warm too
        if (!TAX_RULE_GROUPS_CACHE.has(taxRuleGroupId)) {
            TAX_RULE_GROUPS_CACHE.set(taxRuleGroupId, { id: taxRuleGroupId, rate: rateNum });
        }
        return taxRuleGroupId;
    }

    // Create tax rule group + rule
    const taxRuleGroupPayload = {
        tax_rule_group: {
            name:    `Tax Rule Group for: ${rateStr}%`,
            active:  "1",
            deleted: "0",
        },
    };
    const taxRuleGroupResponse = await createResource("tax_rule_groups", taxRuleGroupPayload);
    taxRuleGroupId = getScalarValue(taxRuleGroupResponse?.data?.tax_rule_group?.id);

    if (!taxRuleGroupId) return "";

    const taxRulePayload = {
        tax_rule: {
            id_tax_rules_group: taxRuleGroupId,
            id_country:         DEFAULT_COUNTRY_ID,
            id_tax:             String(taxId),
            description:        `Tax rule for: ${rateStr}`,
        },
    };
    const createdRule = await createResource("tax_rules", taxRulePayload);
    if (createdRule?.data?.tax_rule) {
        TAX_RULES_CACHE.set(taxId, createdRule.data.tax_rule);
    }
    TAX_RULE_GROUPS_CACHE.set(taxRuleGroupId, { id: taxRuleGroupId, rate: rateNum });

    return taxRuleGroupId;
}

/**
 * Returns the tax rate (e.g. 11.65) for a given tax_rules_group id.
 * Cache key (TAX_RULE_GROUPS_CACHE): taxRulesGroupId → { id, rate }
 */
export async function getTaxRateForGroup(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;

    if (TAX_RULE_GROUPS_CACHE.has(taxRulesGroupId)) {
        return TAX_RULE_GROUPS_CACHE.get(taxRulesGroupId).rate ?? 0;
    }

    const rulesResponse = await getList("tax_rules", {
        display: "full",
        filters: { id_tax_rules_group: String(taxRulesGroupId) },
        limit:   "0,1",
    });
    const rule  = ensureArray(rulesResponse?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) return 0;

    if (rule) TAX_RULES_CACHE.set(taxId, rule);

    const taxResponse = await getList("taxes", {
        display: "full",
        filters: { id: taxId },
        limit:   "0,1",
    });
    const tax  = ensureArray(taxResponse?.data?.taxes?.tax ?? [])[0];
    const rate = parseFloat(getScalarValue(tax?.rate) ?? "0");

    if (tax) {
        const rateStr = String(parseFloat(getScalarValue(tax.rate)));
        TAXES_CACHE.set(rateStr, tax);
    }
    TAX_RULE_GROUPS_CACHE.set(taxRulesGroupId, { id: taxRulesGroupId, rate });

    return rate;
}

// ─── Product options & option values ─────────────────────────────────────────

/**
 * Finds or creates a product_option (attribute group) by name.
 * Cache key: normalizedName → full product_option object.
 * Returns the option id string.
 */
export async function ensureProductOption(name) {
    if (!name) return "";
    const normalizedName = String(name).trim().toLowerCase();

    if (PRODUCT_OPTIONS_CACHE.has(normalizedName)) {
        return getScalarValue(PRODUCT_OPTIONS_CACHE.get(normalizedName)?.id);
    }

    const options = await listAll("product_options");
    const match   = options.find(
        (option) => getLanguageText(option?.name).toLowerCase() === normalizedName
    );

    if (match) {
        PRODUCT_OPTIONS_CACHE.set(normalizedName, match);
        return getScalarValue(match?.id);
    }

    const payload = {
        product_option: {
            name:        toLanguageNodes(name, [DEFAULT_LANG_ID]),
            public_name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            group_type:      "select",
            is_color_group:  "0",
        },
    };
    const response = await createResource("product_options", payload);
    const optionObj = response?.data?.product_option;
    if (optionObj) PRODUCT_OPTIONS_CACHE.set(normalizedName, optionObj);
    return getScalarValue(optionObj?.id);
}

/**
 * Finds or creates a product_option_value for a given group.
 * Cache key: "groupId::normalizedName" → full option_value object.
 * Returns the option value id string.
 */
export async function ensureProductOptionValue(name, groupId) {
    if (!name || !groupId) return "";
    const normalizedName = String(name).trim().toLowerCase();
    const cacheKey       = `${groupId}::${normalizedName}`;

    if (OPTION_VALUES_CACHE.has(cacheKey)) {
        return getScalarValue(OPTION_VALUES_CACHE.get(cacheKey)?.id);
    }

    const values = await listAll("product_option_values");
    const match  = values.find((value) => {
        const valueName  = getLanguageText(value?.name).toLowerCase();
        const valueGroup = getScalarValue(value?.id_attribute_group);
        return valueName === normalizedName && valueGroup === String(groupId);
    });

    if (match) {
        OPTION_VALUES_CACHE.set(cacheKey, match);
        return getScalarValue(match?.id);
    }

    const payload = {
        product_option_value: {
            id_attribute_group: String(groupId),
            name:               toLanguageNodes(name, [DEFAULT_LANG_ID]),
            position:           "0",
        },
    };
    const response = await createResource("product_option_values", payload);
    const valueObj  = response?.data?.product_option_value;
    if (valueObj) OPTION_VALUES_CACHE.set(cacheKey, valueObj);
    return getScalarValue(valueObj?.id);
}

// ─── Stock movements ──────────────────────────────────────────────────────────

/**
 * Finds or creates a stock_movement_reason by name.
 * Cache key: normalizedReason → reasonId string.
 */
export async function ensureStockMvtReason(reason) {
    const normalizedReason = String(reason ?? "").trim();
    if (!normalizedReason) return "";

    if (STOCK_MVT_REASON_CACHE.has(normalizedReason)) {
        return STOCK_MVT_REASON_CACHE.get(normalizedReason);
    }

    const payload = {
        stock_movement_reason: {
            name: toLanguageNodes(normalizedReason),
        },
    };
    const response = await createResource("stock_movement_reasons", payload);
    const reasonId = getScalarValue(response?.data?.stock_movement_reason?.id);

    if (reasonId) STOCK_MVT_REASON_CACHE.set(normalizedReason, reasonId);
    return reasonId;
}

/**
 * Creates a stock movement record.
 * `stockMvt` must include: id_product, id_product_attribute, id_stock,
 *   date_add, quantity, price_te (optional).
 * `reason` is the human-readable reason string.
 */
export async function createStockMvt(stockMvt, reason) {
    const {
        id_product          = "0",
        id_product_attribute = "0",
        id_currency         = "1",
        id_stock            = "0",
        id_order            = "0",
        date_add,
        quantity            = "0",
        price_te            = "0",
    } = stockMvt;

    const normalizedDate   = String(date_add ?? "").trim();
    const parsedQuantity   = parseFloat(quantity);

    if (id_product === "0" || id_stock === "0") {
        throw new Error("id_product and id_stock cannot be '0': " + JSON.stringify(stockMvt));
    }
    if (!normalizedDate) {
        throw new Error("date_add is required for stock movement.");
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
        throw new Error("quantity is invalid or zero: " + JSON.stringify(stockMvt));
    }

    const reasonId = await ensureStockMvtReason(reason);
    if (!reasonId) throw new Error("Stock movement reason missing or not created.");

    const parsedPrice     = parseFloat(price_te);
    const normalizedPrice = Number.isFinite(parsedPrice) ? parsedPrice.toFixed(6) : "0.000000";
    const priceTeValue    = normalizedPrice;

    const payload = {
        stock_movement: {
            id_currency,
            id_product,
            id_product_attribute,
            id_employee:         DEFAULT_EMPLOYEE_ID,
            id_stock,
            id_stock_mvt_reason: reasonId,
            id_order,
            sign:                parsedQuantity >= 0 ? "1" : "-1",
            physical_quantity:   Math.abs(parsedQuantity),
            date_add:            normalizedDate,
            price_te:            priceTeValue,
        },
    };

    const response = await createResource("stock_movements", payload);
    return response?.data?.stock_movement?.id;
}

/**
 * Updates the stock_available record for a product (or combination),
 * then creates the corresponding stock_movement.
 */
export async function patchStockAvailable(
    productId,
    productWholesalePrice,
    combinationId,
    quantity,
    dateAdd
) {
    const response = await getList("stock_availables", {
        display: "full",
        filters: { id_product: productId, id_product_attribute: combinationId },
        limit:   "0,1",
    });

    const stockItem = ensureArray(response?.data?.stock_availables?.stock_available ?? [])[0];
    const stockId   = getScalarValue(stockItem?.id);
    if (!stockId) return;

    await patchResource("stock_availables", stockId, {
        stock_available: {
            id:                   stockId,
            id_product_attribute: combinationId,
            quantity:             String(quantity),
        },
    });

    await createStockMvt(
        {
            id_product:           productId,
            id_product_attribute: combinationId,
            id_stock:             stockId,
            date_add:             dateAdd,
            quantity,
            price_te:             productWholesalePrice,
        },
        "Import data stock !"
    );
}

// ─── Product combinations ─────────────────────────────────────────────────────

/**
 * Returns all combinations for a given productId.
 * Cache key: productId → combination[] (full objects).
 */
export async function getProductCombinations(productId) {
    if (COMBINATIONS_CACHE.has(productId)) {
        return COMBINATIONS_CACHE.get(productId);
    }

    const response = await getList("combinations", {
        display: "full",
        filters: { id_product: productId },
        limit:   "0,100",
    });
    const combos = ensureArray(response?.data?.combinations?.combination ?? []);
    COMBINATIONS_CACHE.set(productId, combos);
    return combos;
}

/**
 * Builds a Map<optionValueId → name> from the full product_option_values list.
 * Uses OPTION_VALUES_CACHE for the individual entries; builds a lookup map
 * for use inside resolveCombinationId.
 */
export async function getOptionValueNameMap() {
    // We fetch them all and warm OPTION_VALUES_CACHE at the same time.
    const values = await listAll("product_option_values");
    const map    = {};
    for (const value of values) {
        const id   = getScalarValue(value?.id);
        const name = getLanguageText(value?.name);
        if (id) {
            map[id] = name || "";
            // warm individual cache entries (key without groupId for lookup purposes)
            const groupId        = getScalarValue(value?.id_attribute_group);
            const normalizedName = name.toLowerCase();
            const cacheKey       = `${groupId}::${normalizedName}`;
            if (!OPTION_VALUES_CACHE.has(cacheKey)) {
                OPTION_VALUES_CACHE.set(cacheKey, value);
            }
        }
    }
    return map;
}

/**
 * Resolves a combination id from a productId + variant label.
 * Returns "0" for no variant, null if variant is expected but not found.
 */
export async function resolveCombinationId(productId, variantLabel) {
    const normalizedVariant = normalizeText(variantLabel);
    if (!normalizedVariant) return "0";

    const combinations   = await getProductCombinations(productId);
    if (!combinations.length) return null;

    const optionValueMap = await getOptionValueNameMap();

    for (const combo of combinations) {
        const optionValues = ensureArray(
            combo?.associations?.product_option_values?.product_option_value ?? []
        );
        const names = optionValues
            .map((opt) => optionValueMap[getScalarValue(opt?.id || opt?.["@_id"])])
            .filter(Boolean)
            .map((name) => normalizeText(name));

        if (names.includes(normalizedVariant)) {
            return getScalarValue(combo?.id);
        }
    }

    return null;
}

// ─── Order states ─────────────────────────────────────────────────────────────

/**
 * Finds or creates an order_state by name.
 * Cache key: normalizedName → full order_state object.
 * Returns the state id string.
 */
export async function ensureOrderState(state) {
    const normalized = normalizeText(state);
    if (!normalized) return "";

    if (ORDER_STATES_CACHE.has(normalized)) {
        return getScalarValue(ORDER_STATES_CACHE.get(normalized)?.id);
    }

    const statesResponse = await getList("order_states", { display: "full" });
    const statesList     = ensureArray(
        statesResponse?.data?.order_states?.order_state ?? []
    );
    const match = statesList.find(
        (s) => normalizeText(getLanguageText(s.name)) === normalized
    );

    if (match) {
        ORDER_STATES_CACHE.set(normalized, match);
        return getScalarValue(match?.id);
    }

    const payload = {
        order_state: {
            name:  toLanguageNodes(state),
            color: DEFAULT_STATE_COLOR,
        },
    };
    const created    = await createResource("order_states", payload);
    const stateObj   = created?.data?.order_state;
    if (stateObj) ORDER_STATES_CACHE.set(normalized, stateObj);
    return getScalarValue(stateObj?.id);
}

// ─── Customers & addresses ────────────────────────────────────────────────────

/**
 * Finds a customer by email.
 * Cache key: normalizedEmail → full customer object.
 */
export async function getCustomerByEmail(email) {
    const normalized = String(email ?? "").trim().toLowerCase();
    if (!normalized) return null;

    if (CUSTOMERS_CACHE.has(normalized)) return CUSTOMERS_CACHE.get(normalized);

    const response  = await getList("customers", {
        display: "full",
        filters: { email: normalized },
        limit:   "0,5",
    });
    const customers = ensureArray(response?.data?.customers?.customer ?? []);
    const customer  = customers.find(
        (c) => getScalarValue(c?.email).toLowerCase() === normalized
    );

    if (customer) CUSTOMERS_CACHE.set(normalized, customer);
    return customer ?? null;
}

/**
 * Sets (or updates) the CUSTOMERS_CACHE for a given email.
 * Call this after creating a new customer so subsequent lookups hit the cache.
 */
export function cacheCustomer(email, customerObj) {
    const normalized = String(email ?? "").trim().toLowerCase();
    if (normalized && customerObj) CUSTOMERS_CACHE.set(normalized, customerObj);
}

/**
 * Returns the first address id for a customer.
 * Cache key: customerId → addressId string.
 */
export async function getCustomerAddressId(customerId) {
    if (ADDRESSES_CACHE.has(customerId)) return ADDRESSES_CACHE.get(customerId);

    const response = await getList("addresses", {
        display: "[id]",
        filters: { id_customer: customerId },
        limit:   "0,1",
    });
    const items     = ensureArray(response?.data?.addresses?.address ?? []);
    const addressId = getScalarValue(items[0]?.id);

    if (addressId) ADDRESSES_CACHE.set(customerId, addressId);
    return addressId;
}

/**
 * Caches an address id for a customer id (call after creating an address).
 */
export function cacheAddress(customerId, addressId) {
    if (customerId && addressId) ADDRESSES_CACHE.set(customerId, addressId);
}