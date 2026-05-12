import {createResource, getList, patchResource, updateResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber, slugify, toLanguageNodes} from "../csvImportUtils.js";
import {ensureArray, getLanguageText, getScalarValue} from "../../utils/util-functions.js";

const DEFAULT_LANG_ID = "1";
const DEFAULT_PARENT_CATEGORY = "2";
const DEFAULT_COUNTRY_ID = "8";
const DEFAULT_SHOP_ID = "1";


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

    const categories = await listAll("categories");
    const match = categories.find(
        (category) =>
            getLanguageText(category?.name).toLowerCase() === normalizedName.toLowerCase()
    );

    if (match) return getScalarValue(match?.id);

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

export async function patchStockAvailableOnly(productId, quantity) {
    const response = await getList("stock_availables", {
        display: "full",
        filters: {id_product: productId},
        limit: "0,1",
    });

    const stockItem = ensureArray(response?.data?.stock_availables?.stock_available ?? [])[0];
    const stockId = getScalarValue(stockItem?.id);
    if (!stockId) return;

    await patchResource("stock_availables", stockId, {
        stock_available: {
            id: stockId,
            id_product_attribute: "0",
            quantity: String(quantity),
        },
    });
}

export async function patchStockAvailable(productId, combinationId, quantity) {
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
    return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
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