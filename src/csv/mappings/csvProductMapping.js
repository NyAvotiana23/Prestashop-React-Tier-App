import {cleanEmptyFields, parseCsvNumber, parseDateToIso, toLanguageNodes} from "../csvImportUtils.js";
import {ensureCategory, ensureTax} from "./csvMappingUtils.js";

const DEFAULT_LANG_ID = "1";


export async function mapProductRowToPayload(row) {
    const name = row?.nom?.trim();
    const reference = row?.reference?.trim();
    if (!name || !reference) {
        throw new Error("Champs requis manquants (nom ou reference).");
    }

    const categoryId = await ensureCategory(row?.categorie);
    const taxId = await ensureTax(row?.Taxe);

    return cleanEmptyFields({
        product: {
            active: "1",
            reference,
            name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
            price: parseCsvNumber(row?.prix_ttc, {decimalSeparator: ","}),
            wholesale_price: parseCsvNumber(row?.prix_achat, {decimalSeparator: ","}),
            id_tax_rules_group: taxId || "",
            id_category_default: categoryId || "",
            available_date: parseDateToIso(row?.date_produit),
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
