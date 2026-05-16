import {createResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber} from "../csvImportUtils.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {
    ensureProductOption,
    ensureProductOptionValue,
    findProductByReference, getTaxRateForGroup, patchStockAvailable,
} from "./csvMappingUtils.js";
import {getDateTimeString} from "../../utils/date-utils.jsx";


/**
 * Ressource concernés : combinations, product_option_values, product_options, stock_availables
 * Price combination.price : delta de difference ht
 * @param row
 * @returns {Promise<{id: (string|*|string)}|{skipped: boolean}>}
 */

function parseFlexibleNumber(value) {
    const comma = parseCsvNumber(value, {decimalSeparator: ","});
    if (comma !== "") return Number(comma);
    const dot = parseCsvNumber(value, {decimalSeparator: "."});
    if (dot !== "") return Number(dot);
    return NaN;
}

export function validateCombinationRow(row) {
    const errors = [];
    const reference = String(row?.reference ?? "").trim();
    if (!reference) errors.push("Reference produit manquante.");

    const specificity = String(row?.specificite ?? row?.["specificité"] ?? "").trim();
    const variantName = String(row?.karazany ?? "").trim();

    if ((specificity && !variantName) || (!specificity && variantName)) {
        errors.push("Specificite et karazany doivent etre fournis ensemble.");
    }

    const stockInitial = parseFlexibleNumber(row?.stock_initial);
    if (!Number.isFinite(stockInitial) || stockInitial < 0) {
        errors.push("Stock initial invalide ou negatif.");
    }

    if (specificity && variantName) {
        const priceTtc = parseFlexibleNumber(row?.prix_vente_ttc);
        if (!Number.isFinite(priceTtc) || priceTtc <= 0) {
            errors.push("Prix vente TTC invalide pour une combinaison.");
        }
    }

    return errors;
}

function ensureCombinationRow(row) {
    const errors = validateCombinationRow(row);
    if (errors.length > 0) {
        throw new Error(errors.join(" | "));
    }
}


export async function processCombinationRow(row) {
    ensureCombinationRow(row);


    const dateAdd = getDateTimeString();

    const reference = row?.reference?.trim();
    if (!reference) throw new Error("Reference produit manquante.");

    const product = await findProductByReference(reference);
    if (!product) throw new Error(`Produit introuvable: ${reference}`);

    const specificity = row?.specificite || row?.["specificité"] || row?.specificite;
    const variantName = row?.karazany;

    const productId = getScalarValue(product?.id);

    const stockInitial = Number(parseCsvNumber(row?.stock_initial, {decimalSeparator: ","}) || 0);


    if (!specificity || !variantName) {
        // Mettre seulement les stock available
        await patchStockAvailable(productId, getScalarValue(product?.wholesale_price), "0", stockInitial, dateAdd);
        return {skipped: true};
    }

    const optionId = await ensureProductOption(String(specificity).trim());
    const optionValueId = await ensureProductOptionValue(String(variantName).trim(), optionId);

    const productBaseHt = parseFloat(getScalarValue(product?.price) ?? "0");
    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);

    // Resolve the tax rate from the product's tax rule group
    const taxRate = await getTaxRateForGroup(taxRulesGroupId);
    const taxMultiplier = 1 + taxRate / 100;

    // Convert combo TTC price to HT, then compute delta vs product base
    const comboTtc = parseFloat(parseCsvNumber(row?.prix_vente_ttc, {decimalSeparator: ","}));
    const comboHt = comboTtc / taxMultiplier;
    const deltaHt = comboHt - productBaseHt;
    const deltaHtStr = String(deltaHt.toFixed(6));
    const payload = {
        combination: {
            id_product: productId,
            price: deltaHtStr,
            minimal_quantity: "1",
            associations: {
                product_option_values: {
                    product_option_value: [{id: String(optionValueId)}],
                },
            },
        },
    };

    const response = await createResource("combinations", payload);
    const combinationId = getScalarValue(response?.data?.combination?.id);

    if (combinationId && Number.isFinite(stockInitial)) {
        await patchStockAvailable(productId, getScalarValue(product?.wholesale_price), combinationId, stockInitial, dateAdd);
    }

    return {id: combinationId};
}
