/**
 * csvProductCombinationMapping.js
 *
 * Concerns: row validation + processing for the "combinations" CSV import.
 * All lookup / ensure / create logic lives in csvMappingUtils.js.
 */

import { createResource } from "../../api/prestashopCrud.js";
import { parseCsvNumber }  from "../csvImportUtils.js";
import { getScalarValue, parseFlexibleNumber } from "../../utils/util-functions.js";
import { getDateTimeString } from "../../utils/date-utils.jsx";
import {
    findProductByReference,
    ensureProductOption,
    ensureProductOptionValue,
    getTaxRateForGroup,
    patchStockAvailable,
} from "./csvMappingUtils.js";
import {COMBINATIONS_CACHE} from "./cache.js";

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateCombinationRow(row) {
    const errors = [];

    const reference = String(row?.reference ?? "").trim();
    if (!reference) errors.push("Reference produit manquante.");

    const specificity = String(row?.specificite ?? row?.["specificité"] ?? "").trim();
    const variantName = String(row?.karazany    ?? "").trim();

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
    if (errors.length > 0) throw new Error(errors.join(" | "));
}

// ─── Row processing ───────────────────────────────────────────────────────────

export async function processCombinationRow(row) {
    ensureCombinationRow(row);

    const dateAdd   = getDateTimeString();
    const reference = String(row?.reference ?? "").trim();

    const product = await findProductByReference(reference);
    if (!product) throw new Error(`Produit introuvable: ${reference}`);

    const specificity = String(row?.specificite ?? row?.["specificité"] ?? "").trim();
    const variantName = String(row?.karazany    ?? "").trim();
    const productId   = getScalarValue(product?.id);
    const stockInitial = Number(parseCsvNumber(row?.stock_initial, { decimalSeparator: "," }) || 0);

    // No combination — just update stock
    if (!specificity || !variantName) {
        await patchStockAvailable(
            productId,
            getScalarValue(product?.wholesale_price),
            "0",
            stockInitial,
            dateAdd
        );
        return { skipped: true };
    }

    const optionId      = await ensureProductOption(specificity);
    const optionValueId = await ensureProductOptionValue(variantName, optionId);

    const productBaseHt    = parseFloat(getScalarValue(product?.price) ?? "0");
    const taxRulesGroupId  = getScalarValue(product?.id_tax_rules_group);
    const taxRate          = await getTaxRateForGroup(taxRulesGroupId);
    const taxMultiplier    = 1 + taxRate / 100;

    const comboTtc  = parseFloat(parseCsvNumber(row?.prix_vente_ttc, { decimalSeparator: "," }));
    const comboHt   = comboTtc / taxMultiplier;
    const deltaHt   = comboHt - productBaseHt;

    const payload = {
        combination: {
            id_product:       productId,
            price:            deltaHt.toFixed(6),
            minimal_quantity: "1",
            associations: {
                product_option_values: {
                    product_option_value: [{ id: String(optionValueId) }],
                },
            },
        },
    };

    const response     = await createResource("combinations", payload);
    const combinationId = getScalarValue(response?.data?.combination?.id);

    // Invalidate combination cache for this product so subsequent order imports
    // pick up the new combination.
    COMBINATIONS_CACHE.delete(productId);

    if (combinationId && Number.isFinite(stockInitial)) {
        await patchStockAvailable(
            productId,
            getScalarValue(product?.wholesale_price),
            combinationId,
            stockInitial,
            dateAdd
        );
    }

    return { id: combinationId };
}