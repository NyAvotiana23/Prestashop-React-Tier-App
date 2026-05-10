# CSV Import

This document describes how CSV files are parsed and transformed before being sent to the PrestaShop API.

## 1) Where it lives

- Config: `src/csv/csvImportConfig.js`
- Headers: `src/csv/csvHeaders.js`
- Mapping: `src/csv/mappings/csvProductMapping.js`, `src/csv/mappings/csvOrderMapping.js`
- Import runner: `src/csv/csvImporter.js`
- UI: `src/pages/ImportDatabase.jsx`, `src/csv/CsvUploader.jsx`, `src/csv/CsvTemplateHolder.jsx`

## 2) Products CSV header

The template header matches `csv_import/products_import.csv` and is exposed in the UI download button for Products.

Notes:
- Headers are currently validated but not blocking; missing headers are reported in the result summary.
- The template download uses the delimiter selected per resource.

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

## 4) Orders CSV header (required fields only)

Required order fields:
- `id_address_delivery`
- `id_address_invoice`
- `id_cart`
- `id_currency`
- `id_lang`
- `id_customer`
- `id_carrier`
- `module`
- `payment`
- `total_paid`
- `total_paid_real`
- `total_products`
- `total_products_wt`
- `conversion_rate`
- `order_details`

`order_details` format:
- A single CSV cell containing multiple JSON objects separated by `;`.
- Each JSON object maps to an `order_row` and must include:
  - `product_name`
  - `product_quantity`
  - `product_price`

Supported optional keys inside each JSON object:
- `product_id`, `product_attribute_id`, `product_reference`, `product_ean13`, `product_isbn`, `product_upc`
- `id_customization`, `unit_price_tax_incl`, `unit_price_tax_excl`

Example value (wrap the whole cell in quotes):

```csv
{"product_id":1,"product_quantity":2,"product_name":"T-shirt","product_price":50.00}; {"product_id":2,"product_quantity":1,"product_name":"Cap","product_price":20.00}
```

## 5) Import flow (UI)

1. Go to `/import-database`.
2. Select delimiter and decimal separator for each resource row.
3. Download a CSV template (uses the chosen delimiter) if needed.
4. Upload the CSV file for a resource.
5. Click "Import CSV" to create resources one by one.
6. The UI shows per-resource progress, created count, and errors.

Preview:
- The "Charger donnees" button fetches a sample list (`limit: 0,5`) for each checked resource.

## 6) Import flow (code)

1. CSV is parsed with PapaParse (headers + rows).
2. Each row is mapped to a PrestaShop JSON payload.
3. `createResource(ref, payload)` sends XML to PrestaShop.
4. Progress callbacks are emitted per row.

Decimal handling:
- Numeric fields are normalized using the selected decimal separator.

## 7) Demo (local)

The demo parses the first row and prints the payload:

```bash
npm run csv:demo
```
