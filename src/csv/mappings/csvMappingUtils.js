import {createResource, getList, patchResource, updateResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber, slugify, toLanguageNodes} from "../csvImportUtils.js";
import {ensureArray, getLanguageText, getScalarValue} from "../../utils/util-functions.js";


const DEFAULT_LANG_ID = "1";
const DEFAULT_PARENT_CATEGORY = "1";
const DEFAULT_COUNTRY_ID = "8";
const DEFAULT_SHOP_ID = "1";

const DEFAULT_EMPLOYE_ID = "1";

const stockMvtReasonCache = new Map();

export async function createStockMvtReason(reason) {
    try {
        const normalizedReason = String(reason ?? "").trim();
        if (!normalizedReason) return "";

        if (stockMvtReasonCache.has(normalizedReason)) {
            return stockMvtReasonCache.get(normalizedReason);
        }

        const stockMvtReasonPayload = {
            stock_movement_reason: {
                name: toLanguageNodes(normalizedReason)
            }
        }
        const reasonResponse = await createResource("stock_movement_reasons", stockMvtReasonPayload);
        const reasonId = getScalarValue(reasonResponse?.data?.stock_movement_reason?.id);
        if (reasonId) {
            stockMvtReasonCache.set(normalizedReason, reasonId);
            return reasonId;
        }

        return "";
    } catch (e) {
        console.log("ERROR CREATING STOCK MOUVEMENT REASON " + e.message)
        throw e;

    }

}

export async function createStockMvt(stockMvt, reason) {
    try {
        const {
            id_product = "0",
            id_product_attribute = "0",
            id_currency = "1",
            id_stock = "0",
            id_order = "0",
            date_add,
            quantity = "0",
            price_te = "0"
        } = stockMvt;

        const normalizedDate = String(date_add ?? "").trim();
        const parsedQuantity = parseFloat(quantity);
        if (id_product === "0" || id_stock === "0") {
            throw new Error("Some values cannot be '0' : " + JSON.stringify(stockMvt));
        }
        if (!normalizedDate) {
            throw new Error("date_add is required for stock movement.");
        }
        if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
            throw new Error("quantity is invalid or zero : " + JSON.stringify(stockMvt));
        }

        const idStockMvtReason = await createStockMvtReason(reason);
        if (!idStockMvtReason) {
            throw new Error("Stock movement reason missing or not created.");
        }

        const parsedPrice = parseFloat(price_te);
        const normalizedPrice = Number.isFinite(parsedPrice) ? parsedPrice.toFixed(6) : "0.000000";
        const priceTeValue = parsedQuantity < 0 ? "0.000000" : normalizedPrice;
        const stockMvtPayload = {
            stock_movement: {
                id_currency,
                id_product,
                id_product_attribute,
                id_employee: DEFAULT_EMPLOYE_ID,
                id_stock,
                id_stock_mvt_reason: idStockMvtReason,
                id_order,
                sign: parsedQuantity >= 0 ? "1" : "-1",
                physical_quantity: Math.abs(parsedQuantity),
                date_add: normalizedDate,
                price_te: priceTeValue
            }
        }

        const stockMouvementResponse = await createResource("stock_movements", stockMvtPayload);
        return stockMouvementResponse?.data?.stock_movement?.id;
    } catch (e) {
        console.log("ERROR CREATING STOCK MOUVEMENT " + e.message)
        throw e;
    }


}


export async function listAll(ref) {
    const response = await getList(ref, {
        display: "full",
        limit: "0,1000",
    });
    const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    return ensureArray(node);
}

export async function findProductByReference(reference) {
    const response = await getList("products", {
        display: "full",
        filters: {reference: reference},
        limit: "0,5",
    });
    const items = ensureArray(response?.data?.products?.product ?? []);
    return items.length > 0 ? items[0] : null;
}

export async function ensureCategory(name) {
    const normalizedName = String(name ?? "").trim();
    if (!normalizedName) return "";

    const categoriesResponse = await getList("categories",
        {
            display: "full",
            sort: "[id_ASC]",
            filters: {
                name: normalizedName
            }
        }
    );

    const categoriesData = categoriesResponse?.data?.categories?.category ?? [];
    console.log("Categories response " +  categoriesResponse)
    console.log("Norm : " + normalizedName);
    console.log("Categories data : " + categoriesData);

    if (categoriesData.length > 0) {
        console.log("Find : " + normalizedName + " Id : " + categoriesData[0]?.id)
        return categoriesData[0]?.id;
    }

    const payload = {
        category: {
            id_parent: DEFAULT_PARENT_CATEGORY,
            active: "1",
            name: toLanguageNodes(normalizedName, [DEFAULT_LANG_ID]),
            link_rewrite: toLanguageNodes(slugify(normalizedName), [DEFAULT_LANG_ID]),
        },
    };

    const response = await createResource("categories", payload);
    return getScalarValue(response?.data?.category?.id);
}

/**
 * rate comes in already parsed by parseCsvNumber — a clean number like 11.65 or 5.6.
 * We compare using parseFloat on both sides to handle trailing zeros ("11.650" === 11.65).
 */
export async function ensureTaxRuleGroup(rate) {
    const rateNum = parseFloat(rate);
    if (!rate || isNaN(rateNum)) return "";

    const rateStr = String(rateNum);

    const taxListResponse = await getList("taxes", {
        display: "full",
        filters: {rate: rateStr},
        limit: "0,5",
    });
    const taxItems = ensureArray(taxListResponse?.data?.taxes?.tax ?? []);
    const existingTax = taxItems[0];

    let taxId = getScalarValue(existingTax?.id);
    if (!taxId) {
        const taxPayload = {
            tax: {
                rate: rateStr,
                active: "1",
                deleted: "0",
                name: toLanguageNodes(`Taxe ${rateStr}%`, [DEFAULT_LANG_ID]),
            },
        };
        const taxResponse = await createResource("taxes", taxPayload);
        taxId = getScalarValue(taxResponse?.data?.tax?.id);
    }

    if (!taxId) return "";

    const taxRuleResponse = await getList("tax_rules", {
        display: "full",
        filters: {id_tax: String(taxId)},
        limit: "0,5",
    });
    const taxRuleItems = ensureArray(taxRuleResponse?.data?.tax_rules?.tax_rule ?? []);
    const existingTaxRule = taxRuleItems[0];

    if (existingTaxRule) {
        return getScalarValue(existingTaxRule?.id_tax_rules_group);
    }

    const taxRuleGroupPayload = {
        tax_rule_group: {
            name: `Tax Rule Group for: ${rateStr}%`,
            active: "1",
            deleted: "0",
        },
    };
    const taxRuleGroupResponse = await createResource("tax_rule_groups", taxRuleGroupPayload);
    const taxRuleGroupId = getScalarValue(taxRuleGroupResponse?.data?.tax_rule_group?.id);

    if (!taxRuleGroupId) return "";

    const taxRulePayload = {
        tax_rule: {
            id_tax_rules_group: taxRuleGroupId,
            id_country: DEFAULT_COUNTRY_ID,
            id_tax: String(taxId),
            description: `Tax rule for: ${rateStr}`,
        },
    };
    await createResource("tax_rules", taxRulePayload);

    return taxRuleGroupId;
}

export async function ensureProductOption(name) {
    if (!name) return "";
    const options = await listAll("product_options");
    const match = options.find(
        (option) => getLanguageText(option?.name).toLowerCase() === name.toLowerCase()
    );
    if (match) return getScalarValue(match?.id);

    const payload = {
        product_option: {
            name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            public_name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            group_type: "select",
            is_color_group: "0",
        },
    };

    const response = await createResource("product_options", payload);
    return getScalarValue(response?.data?.product_option?.id);
}

export async function ensureProductOptionValue(name, groupId) {
    if (!name || !groupId) return "";
    const values = await listAll("product_option_values");
    const match = values.find((value) => {
        const valueName = getLanguageText(value?.name).toLowerCase();
        const valueGroup = getScalarValue(value?.id_attribute_group);
        return valueName === name.toLowerCase() && valueGroup === String(groupId);
    });
    if (match) return getScalarValue(match?.id);

    const payload = {
        product_option_value: {
            id_attribute_group: String(groupId),
            name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            position: "0",
        },
    };

    const response = await createResource("product_option_values", payload);
    return getScalarValue(response?.data?.product_option_value?.id);
}

/**
 * Fetches the tax rate (e.g. 11.65) for a given tax_rules_group id.
 * Looks up tax_rules for the group, then reads the rate from the linked tax.
 */
export async function getTaxRateForGroup(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;

    const rulesResponse = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit: "0,1",
    });
    const rule = ensureArray(rulesResponse?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) return 0;

    const taxResponse = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit: "0,1",
    });
    const tax = ensureArray(taxResponse?.data?.taxes?.tax ?? [])[0];
    return parseFloat(getScalarValue(tax?.rate) ?? "0");
}

export async function patchStockAvailable(productId, productWholeSalePrice , combinationId, quantity, dateAdd) {
    const response = await getList("stock_availables", {
        display: "full",
        filters: {id_product: productId, id_product_attribute: combinationId},
        limit: "0,1",
    });

    const stockItem = ensureArray(response?.data?.stock_availables?.stock_available ?? [])[0];
    const stockId = getScalarValue(stockItem?.id);
    if (!stockId) return;

    await patchResource("stock_availables", stockId, {
        stock_available: {
            id: stockId,
            id_product_attribute: combinationId,
            quantity: String(quantity),
        },
    });

    const stockMvt = {
        id_product: productId,
        id_product_attribute: combinationId,
        id_stock: stockId,
        date_add: dateAdd,
        quantity,
        price_te: productWholeSalePrice
    }
    await createStockMvt(stockMvt, "Import data stock !")

}

export async function getCustomerByEmail(email) {
    const normalized = String(email ?? "").trim().toLowerCase();
    const response = await getList("customers", {
        display: "full",
        filters: {email: normalized},
        limit: "0,5",
    });
    const customers = ensureArray(response?.data?.customers?.customer ?? []);
    return customers.find(
        (customer) => getScalarValue(customer?.email).toLowerCase() === normalized
    );
}

export async function getCustomerAddressId(customerId) {
    const response = await getList("addresses", {
        display: "[id]",
        filters: {id_customer: customerId},
        limit: "0,1",
    });
    const items = ensureArray(response?.data?.addresses?.address ?? []);
    return getScalarValue(items[0]?.id);
}

export async function getFirstId(ref) {
    const response = await getList(ref, {
        display: "[id]",
        limit: "0,1",
    });
    const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    const items = ensureArray(node);
    return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}