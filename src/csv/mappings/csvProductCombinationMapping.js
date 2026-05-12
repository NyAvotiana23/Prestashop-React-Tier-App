import {createResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber} from "../csvImportUtils.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {
    ensureProductOption,
    ensureProductOptionValue,
    findProductByReference, getTaxRateForGroup, patchStockAvailable, patchStockAvailableOnly,
} from "./csvMappingUtils.js";


/**
 * Ressource concernés : combinations, product_option_values, product_options, stock_availables
 * Price combination.price : delta de difference ht
 * @param row
 * @returns {Promise<{id: (string|*|string)}|{skipped: boolean}>}
 */




export async function processCombinationRow(row) {
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
        await patchStockAvailableOnly(productId, stockInitial);
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
        await patchStockAvailable(productId, combinationId, stockInitial);
    }

    return {id: combinationId};
}
