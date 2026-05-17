/**
 * csvProductMapping.js
 *
 * Concerns: row validation + payload mapping for the "products" CSV import.
 * All lookup / ensure / create logic lives in csvMappingUtils.js.
 */

import {cleanEmptyFields, parseCsvNumber, parseDateToIso, toLanguageNodes} from "../csvImportUtils.js";
import {
    ensureCategory,
    ensureTaxRuleGroup,
    DEFAULT_LANG_ID,
    DEFAULT_MANUFACTURER_ID,
    DEFAULT_SUPPLIER_ID,
    DEFAULT_MINIMAL_QUANTITY,
    DEFAULT_SHOW_PRICE,
    DEFAULT_SHOP_ID,
} from "./csvMappingUtils.js";
import {parseFlexibleNumber} from "../../utils/util-functions.js";
import {isValidDate} from "../../utils/date-utils.jsx";

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateProductRow(row) {
    const errors = [];

    const name = String(row?.nom ?? "").trim();
    const reference = String(row?.reference ?? "").trim();
    if (!name || !reference) {
        errors.push("Champs requis manquants (nom ou reference).");
    }

    const dateRaw = String(row?.date_availability_produit ?? "").trim();
    if (!isValidDate(dateRaw, 'DD/MM/YYYY')) {
        errors.push("Date disponibilite invalide (format attendu JJ/MM/AAAA).");
    }
    if (dateRaw && !parseDateToIso(dateRaw)) {
        errors.push("Date disponibilite invalide (format attendu JJ/MM/AAAA).");
    }

    const priceTtc = parseFlexibleNumber(row?.prix_ttc);
    if (priceTtc <= 0) {
        errors.push("Prix TTC invalide ou negatif.");
    }

    const taxRate = parseFlexibleNumber(row?.Taxe);
    if (taxRate < 0) {
        errors.push(`Taxe invalide : ${taxRate}`);
    }

    const wholesale = parseFlexibleNumber(row?.prix_achat);
    if (!Number.isFinite(wholesale) || wholesale < 0) {
        errors.push("Prix achat invalide ou negatif.");
    }

    return errors;
}

function ensureProductRow(row) {
    const errors = validateProductRow(row);
    if (errors.length > 0) throw new Error(errors.join(" | "));
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

/**
 * Maps one validated CSV row to a PrestaShop product creation payload.
 * Handles category + tax rule group creation via shared utils.
 */
export async function mapProductRowToPayload(row) {
    ensureProductRow(row);

    const name = row?.nom?.trim();
    const reference = row?.reference?.trim();
    if (!name || !reference) {
        throw new Error("Champs requis manquants (nom ou reference).");
    }

    const taxRate = parseCsvNumber(row?.Taxe, {decimalSeparator: ",", stripPercent: true});
    const categoryId = await ensureCategory(row?.categorie);
    const taxRuleGroupId = await ensureTaxRuleGroup(taxRate);

    const priceTtc = parseCsvNumber(row?.prix_ttc, {decimalSeparator: ","});
    const priceHt = parseFloat(priceTtc) / (1 + parseFloat(taxRate) / 100);

    return cleanEmptyFields({
        product: {
            active: "1",
            available_for_order: "1",
            id_shop_default: DEFAULT_SHOP_ID,
            id_manufacturer: DEFAULT_MANUFACTURER_ID,
            id_supplier: DEFAULT_SUPPLIER_ID,
            minimal_quantity: DEFAULT_MINIMAL_QUANTITY,
            show_price: DEFAULT_SHOW_PRICE,
            reference,
            name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            price: priceHt.toFixed(6),
            wholesale_price: parseCsvNumber(row?.prix_achat, {decimalSeparator: ","}),
            id_tax_rules_group: taxRuleGroupId || "",
            id_category_default: categoryId || "",
            state: "1",
            visibility: "both",
            available_date: parseDateToIso(row?.date_availability_produit),
            associations: categoryId
                ? {categories: {category: [{id: String(categoryId)}]}}
                : undefined,
        },
    });
}