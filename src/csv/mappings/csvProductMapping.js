import {
    cleanEmptyFields,
    isNumericString,
    parseCsvBoolean,
    parseCsvList,
    parseCsvNumber,
    slugify,
    toLanguageNodes,
} from "../csvImportUtils.js";


const DEFAULT_STATE = "1";
export const PRODUCTS_CSV_FIELD_MAP = {
    "Active (0/1)": "active",
    "Name *": "name",
    "Summary": "description_short",
    "Description": "description",
    "Meta title": "meta_title",
    "Meta keywords": "meta_keywords",
    "Meta description": "meta_description",
    "URL rewritten": "link_rewrite",
    "Price tax excluded": "price",
    "Wholesale price": "wholesale_price",
    "Tax rules ID": "id_tax_rules_group",
    "On sale (0/1)": "on_sale",
    "Reference #": "reference",
    "Supplier reference #": "supplier_reference",
    "EAN13": "ean13",
    "UPC": "upc",
    "Ecotax": "ecotax",
    "Width": "width",
    "Height": "height",
    "Depth": "depth",
    "Weight": "weight",
    "Minimal quantity": "minimal_quantity",
    "Low stock level": "low_stock_threshold",
    "Receive a low stock alert by email": "low_stock_alert",
    "Visibility": "visibility",
    "Additional shipping cost": "additional_shipping_cost",
    "Unity": "unity",
    "Unit price": "unit_price",
    "Text when in stock": "available_now",
    "Text when backorder allowed": "available_later",
    "Available for order (0 = No, 1 = Yes)": "available_for_order",
    "Product available date": "available_date",
    "Show price (0 = No, 1 = Yes)": "show_price",
    "Available online only (0 = No, 1 = Yes)": "online_only",
    "Condition": "condition",
    "Customizable (0 = No, 1 = Yes)": "customizable",
    "Uploadable files (0 = No, 1 = Yes)": "uploadable_files",
    "Text fields (0 = No, 1 = Yes)": "text_fields",
    "Virtual product": "is_virtual",
    "Delivery time of in-stock products": "delivery_in_stock",
    "Delivery time of out-of-stock products with allowed orders": "delivery_out_stock",
};

export function mapProductRowToPayload(row, options = {}) {
    const languageIds = options.languageIds ?? ["1"];
    const decimalSeparator = options.decimalSeparator ?? ".";
    const defaultCategoryId = options.defaultCategoryId ?? "1";

    const name = row["Name *"]?.trim();
    if (!name) {
        throw new Error("Missing required field: Name *");
    }

    const linkRewriteValue =
        row["URL rewritten"]?.trim() || slugify(row["Name *"]);

    const categoryIds = parseCsvList(row["Categories (x,y,z...)"], {
        delimiter: ",",
    }).filter(isNumericString);

    const idCategoryDefault =
        categoryIds[0] ?? (isNumericString(defaultCategoryId) ? defaultCategoryId : "");

    const supplierId = isNumericString(row["Supplier"]) ? row["Supplier"].trim() : "";
    const manufacturerId = isNumericString(row["Manufacturer"]) ? row["Manufacturer"].trim() : "";


    const payload = {
        product: {
            state: DEFAULT_STATE,
            active: parseCsvBoolean(row["Active (0/1)"], "1"),
            name: toLanguageNodes(name, languageIds),
            description_short: toLanguageNodes(row["Summary"], languageIds),
            description: toLanguageNodes(row["Description"], languageIds),
            meta_title: toLanguageNodes(row["Meta title"], languageIds),
            meta_keywords: toLanguageNodes(row["Meta keywords"], languageIds),
            meta_description: toLanguageNodes(row["Meta description"], languageIds),
            link_rewrite: toLanguageNodes(linkRewriteValue, languageIds),
            delivery_in_stock: toLanguageNodes(
                row["Delivery time of in-stock products"],
                languageIds
            ),
            delivery_out_stock: toLanguageNodes(
                row["Delivery time of out-of-stock products with allowed orders"],
                languageIds
            ),
            available_now: toLanguageNodes(row["Text when in stock"], languageIds),
            available_later: toLanguageNodes(row["Text when backorder allowed"], languageIds),
            price: parseCsvNumber(row["Price tax excluded"], {decimalSeparator}),
            wholesale_price: parseCsvNumber(row["Wholesale price"], {decimalSeparator}),
            unit_price: parseCsvNumber(row["Unit price"], {decimalSeparator}),
            additional_shipping_cost: parseCsvNumber(row["Additional shipping cost"], {
                decimalSeparator,
            }),
            ecotax: parseCsvNumber(row["Ecotax"], {decimalSeparator}),
            width: parseCsvNumber(row["Width"], {decimalSeparator}),
            height: parseCsvNumber(row["Height"], {decimalSeparator}),
            depth: parseCsvNumber(row["Depth"], {decimalSeparator}),
            weight: parseCsvNumber(row["Weight"], {decimalSeparator}),
            minimal_quantity: parseCsvNumber(row["Minimal quantity"], {
                decimalSeparator,
            }),
            low_stock_threshold: parseCsvNumber(row["Low stock level"], {
                decimalSeparator,
            }),
            low_stock_alert: parseCsvBoolean(
                row["Receive a low stock alert by email"],
                "0"
            ),
            on_sale: parseCsvBoolean(row["On sale (0/1)"], "0"),
            online_only: parseCsvBoolean(row["Available online only (0 = No, 1 = Yes)"], "0"),
            available_for_order: parseCsvBoolean(
                row["Available for order (0 = No, 1 = Yes)"],
                "1"
            ),
            show_price: parseCsvBoolean(row["Show price (0 = No, 1 = Yes)"], "1"),
            condition: row["Condition"]?.trim() ?? "",
            customizable: parseCsvBoolean(row["Customizable (0 = No, 1 = Yes)"], "0"),
            uploadable_files: parseCsvBoolean(row["Uploadable files (0 = No, 1 = Yes)"], "0"),
            text_fields: parseCsvBoolean(row["Text fields (0 = No, 1 = Yes)"], "0"),
            is_virtual: parseCsvBoolean(row["Virtual product"], "0"),
            visibility: row["Visibility"]?.trim() ?? "",
            reference: row["Reference #"]?.trim() ?? "",
            supplier_reference: row["Supplier reference #"]?.trim() ?? "",
            ean13: row["EAN13"]?.trim() ?? "",
            upc: row["UPC"]?.trim() ?? "",
            unity: row["Unity"]?.trim() ?? "",
            id_tax_rules_group: row["Tax rules ID"]?.trim() ?? "",
            id_category_default: idCategoryDefault,
            id_supplier: supplierId,
            id_manufacturer: manufacturerId,
            available_date: row["Product available date"]?.trim() ?? "",
            associations: categoryIds.length
                ? {
                    categories: {
                        category: categoryIds.map((id) => ({id: String(id)})),
                    },
                }
                : undefined,
        },
    };

    return cleanEmptyFields(payload);
}

