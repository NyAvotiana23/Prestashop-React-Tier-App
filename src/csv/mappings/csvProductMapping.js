import {cleanEmptyFields, parseCsvNumber, parseDateToIso, toLanguageNodes} from "../csvImportUtils.js";
import {ensureCategory, ensureTaxRuleGroup} from "./csvMappingUtils.js";

const DEFAULT_LANG_ID = "1";
const DEFAULT_PRODUCT_STATE = "1";
const DEFAULT_AVAILABLE_FOR_ORDER = "1";
const DEFAULT_SHOP = "1";
const DEFAULT_MANUFACTURER = "1"
const DEFAULT_SUPPLIER = "1";
const DEFAULT_MINIMAL_QUANTITY = "1";
const DEFAULT_SHOW_PRICE = "1";


/**
 * Ressource concernés : Product, Tax, Tax Rule, Tax Rule Group, Categorie
 * @param row
 * @returns {Promise<*>}
 */

export async function mapProductRowToPayload(row) {
    const name = row?.nom?.trim();
    const reference = row?.reference?.trim();
    if (!name || !reference) {
        throw new Error("Champs requis manquants (nom ou reference).");
    }

    const taxRate = parseCsvNumber(row?.Taxe, {decimalSeparator: ",", stripPercent: true});

    const categoryId = await ensureCategory(row?.categorie);
    const taxRuleGroupId = await ensureTaxRuleGroup(taxRate);

    const priceTtc = parseCsvNumber(row?.prix_ttc, {decimalSeparator: ","});

    const priceHt = parseFloat(priceTtc) / (1 + (parseFloat(taxRate) / 100));
    const priceHtStr = String(priceHt.toFixed(6));

    return cleanEmptyFields({
        product: {
            active: "1",
            available_for_order: DEFAULT_AVAILABLE_FOR_ORDER,
            id_shop_default: DEFAULT_SHOP,
            id_manufacturer: DEFAULT_MANUFACTURER,
            id_supplier: DEFAULT_SUPPLIER,
            minimal_quantity: DEFAULT_MINIMAL_QUANTITY,
            show_price: DEFAULT_SHOW_PRICE,
            reference,
            name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            price: priceHtStr,
            wholesale_price: parseCsvNumber(row?.prix_achat, {decimalSeparator: ","}),
            id_tax_rules_group: taxRuleGroupId || "",
            id_category_default: categoryId || "",
            state: DEFAULT_PRODUCT_STATE,
            visibility: "both",
            available_date: parseDateToIso(row?.date_availability_produit),
            associations: categoryId
                ? {
                    categories: {
                        category: [{id: String(categoryId)}],
                    },
                }
                : undefined,
        },
    });
}