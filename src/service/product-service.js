import {getList} from "../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../utils/util-functions.js";


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
export async function getProductPricing(productId, combinationId) {
    const productResponse = await getList("products", {
        display: "full",
        filters: {id: productId},
        limit: "0,1",
    });
    const product = ensureArray(productResponse?.data?.products?.product ?? [])[0];
    if (!product) {
        throw new Error(`Produit introuvable: ${productId}`);
    }

    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate = taxRulesGroupId ? await getTaxRateForGroup(taxRulesGroupId) : 0;
    const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;

    let effectiveHt = baseHt;
    if (combinationId && String(combinationId) !== "0") {
        const comboResponse = await getList("combinations", {
            display: "full",
            filters: {id: combinationId},
            limit: "0,1",
        });
        const combo = ensureArray(comboResponse?.data?.combinations?.combination ?? [])[0];
        const deltaHt = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;
        effectiveHt = baseHt + deltaHt;
    }

    const priceTtc = effectiveHt * (1 + taxRate / 100);
    return {priceHt: effectiveHt, priceTtc};
}