# CSV Import

This document describes how CSV files are parsed and transformed before being sent to the PrestaShop API.

## 1) Where it lives

- Config: `src/csv/csvImportConfig.js`
- Headers: `src/csv/csvHeaders.js`
- Mapping: `src/csv/csvProductMapping.js`
- Import runner: `src/csv/csvImporter.js`

## 2) Products CSV header

The template header matches `csv_import/products_import.csv` and is exposed in the UI download button for Products.

## 3) Product mapping (CSV -> XML fields)

Required:
- `Name *` -> `product.name` (language nodes)

Main mappings:
- `Active (0/1)` -> `product.active`
- `Price tax excluded` -> `product.price`
- `Tax rules ID` -> `product.id_tax_rules_group`
- `Wholesale price` -> `product.wholesale_price`
- `On sale (0/1)` -> `product.on_sale`
- `Reference #` -> `product.reference`
- `Supplier reference #` -> `product.supplier_reference`
- `EAN13` -> `product.ean13`
- `UPC` -> `product.upc`
- `Ecotax` -> `product.ecotax`
- `Width` -> `product.width`
- `Height` -> `product.height`
- `Depth` -> `product.depth`
- `Weight` -> `product.weight`
- `Minimal quantity` -> `product.minimal_quantity`
- `Low stock level` -> `product.low_stock_threshold`
- `Receive a low stock alert by email` -> `product.low_stock_alert`
- `Visibility` -> `product.visibility`
- `Additional shipping cost` -> `product.additional_shipping_cost`
- `Unity` -> `product.unity`
- `Unit price` -> `product.unit_price`
- `Summary` -> `product.description_short` (language nodes)
- `Description` -> `product.description` (language nodes)
- `Meta title` -> `product.meta_title` (language nodes)
- `Meta keywords` -> `product.meta_keywords` (language nodes)
- `Meta description` -> `product.meta_description` (language nodes)
- `URL rewritten` -> `product.link_rewrite` (language nodes)
- `Text when in stock` -> `product.available_now` (language nodes)
- `Text when backorder allowed` -> `product.available_later` (language nodes)
- `Available for order (0 = No, 1 = Yes)` -> `product.available_for_order`
- `Product available date` -> `product.available_date`
- `Show price (0 = No, 1 = Yes)` -> `product.show_price`
- `Available online only (0 = No, 1 = Yes)` -> `product.online_only`
- `Condition` -> `product.condition`
- `Customizable (0 = No, 1 = Yes)` -> `product.customizable`
- `Uploadable files (0 = No, 1 = Yes)` -> `product.uploadable_files`
- `Text fields (0 = No, 1 = Yes)` -> `product.text_fields`
- `Virtual product` -> `product.is_virtual`
- `Delivery time of in-stock products` -> `product.delivery_in_stock` (language nodes)
- `Delivery time of out-of-stock products with allowed orders` -> `product.delivery_out_stock` (language nodes)

IDs and associations:
- `Categories (x,y,z...)` -> `product.associations.categories` (only numeric values are used)
- `Supplier` -> `product.id_supplier` (only numeric values are used)
- `Manufacturer` -> `product.id_manufacturer` (only numeric values are used)

Auto defaults:
- `product.link_rewrite` is generated from `Name *` when empty.
- `product.id_category_default` is set to the first numeric category or to the default in config.

Not mapped yet (kept for future):
- Images, tags, feature values, accessories, advanced stock fields.

## 4) Import flow

1. Upload CSV in the Import page.
2. The parser validates headers.
3. Each row is transformed to a JSON payload.
4. `createResource("products", payload)` sends the XML to PrestaShop.

## 5) Demo (local)

The demo parses the first row and prints the payload:

```bash
npm run csv:demo
```

