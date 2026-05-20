# PrestaShop 8.2.6 — Specific Prices & Specific Price Rules (API)

---

## 1. What Is a Specific Price?

A **Specific Price** is a conditional pricing rule applied to a **single product** (optionally a product attribute/combination). It overrides or reduces the base catalog price under precise conditions such as:

- A particular shop, currency, country, or customer group
- A specific customer
- A minimum purchase quantity
- A date range

It is the backbone of PrestaShop's promotional pricing engine. Every discount you set in the back-office "Catalog Price Rules" or "Special Prices" tab of a product ends up stored as a `specific_price` record.

**Key distinction:**

| Concept | Scope | API Resource |
|---|---|---|
| **Specific Price** | One product (+ optional combination, customer, etc.) | `/api/specific_prices` |
| **Specific Price Rule** | A template applied to whole categories / catalogs | `/api/specific_price_rules` |

---

## 2. What Is a Specific Price Rule?

A **Specific Price Rule** (catalog price rule) is a *template* that PrestaShop uses to generate `specific_price` records automatically for multiple products matching criteria (shop, currency, country, group, quantity threshold, date window).

When you apply a rule to a set of products via the back-office or a dedicated endpoint, PrestaShop creates individual `specific_price` rows for each matching product and links them via `id_specific_price_rule`.

> A `specific_price_rule` **does not reduce prices by itself**. It must be applied (materialized) to products to have effect.

---

## 3. Are These Reductions?

Yes — both resources express either:

1. **A fixed override price** (`price` field ≠ `-1`) — the product is sold at exactly that amount regardless of the catalog price.
2. **A reduction** (`reduction` > 0) — a discount applied on top of (or instead of) the base price.

Both mechanisms can coexist: you can set a fixed price *and* a reduction, though in practice only one is typically used at a time.

---

## 4. Specific Price Rule — Field Reference

```xml
<specific_price_rule>
    <id_shop>        ... </id_shop>
    <id_country>     ... </id_country>
    <id_currency>    ... </id_currency>
    <id_group>       ... </id_group>
    <name>           ... </name>
    <from_quantity>  ... </from_quantity>
    <price>          ... </price>
    <reduction>      ... </reduction>
    <reduction_tax>  ... </reduction_tax>
    <reduction_type> ... </reduction_type>
    <from>           ... </from>
    <to>             ... </to>
</specific_price_rule>
```

| Field | Format | Required | Description |
|---|---|---|---|
| `id_shop` | `isUnsignedId` | ✅ | Shop this rule applies to. Use `1` for the default shop. `0` = all shops. |
| `id_country` | `isUnsignedId` | ✅ | Restrict to a country (`id` from `/api/countries`). `0` = all countries. |
| `id_currency` | `isUnsignedId` | ✅ | Restrict to a currency (`id` from `/api/currencies`). `0` = all currencies. |
| `id_group` | `isUnsignedId` | ✅ | Restrict to a customer group (`id` from `/api/groups`). `0` = all groups. |
| `name` | `isCleanHtml` | ✅ | Human-readable label for this rule (displayed in back-office). |
| `from_quantity` | `isUnsignedInt` | ✅ | Minimum cart/order quantity for the rule to activate. `1` = no minimum. |
| `price` | `isNegativePrice` | ✅ | Fixed selling price (tax-excluded). Use `-1` to keep the catalog price and apply only a reduction. |
| `reduction` | `isPrice` | ✅ | Discount amount. Interpreted as a percentage (0–1 range) or absolute amount depending on `reduction_type`. `0` = no reduction. |
| `reduction_tax` | `isBool` | ✅ | Whether the absolute reduction is tax-included (`1`) or tax-excluded (`0`). Ignored when `reduction_type` is `percentage`. |
| `reduction_type` | `isReductionType` | ✅ | `percentage` or `amount`. Determines how `reduction` is interpreted. |
| `from` | `isDateFormat` | ❌ | Rule validity start date (format `YYYY-MM-DD HH:MM:SS`). Leave empty for no start constraint. |
| `to` | `isDateFormat` | ❌ | Rule validity end date. Leave empty for no end constraint. |

---

## 5. Specific Price — Field Reference

```xml
<specific_price>
    <id>                      ... </id>
    <id_shop_group>           ... </id_shop_group>
    <id_shop>                 ... </id_shop>
    <id_cart>                 ... </id_cart>
    <id_product>              ... </id_product>
    <id_product_attribute>    ... </id_product_attribute>
    <id_currency>             ... </id_currency>
    <id_country>              ... </id_country>
    <id_group>                ... </id_group>
    <id_customer>             ... </id_customer>
    <id_specific_price_rule>  ... </id_specific_price_rule>
    <price>                   ... </price>
    <from_quantity>           ... </from_quantity>
    <reduction>               ... </reduction>
    <reduction_tax>           ... </reduction_tax>
    <reduction_type>          ... </reduction_type>
    <from>                    ... </from>
    <to>                      ... </to>
</specific_price>
```

| Field | Description |
|---|---|
| `id` | Auto-generated primary key. Leave empty on creation. |
| `id_shop_group` | Shop group scope. `0` = applies to all shop groups. Typically `0` unless running a complex multi-shop setup. |
| `id_shop` | Shop scope. `0` = all shops; use specific shop id for isolation. |
| `id_cart` | Tie the specific price to a single cart. Almost always `0` (not cart-specific). Used internally for cart rules. |
| `id_product` | **Required.** The product this price applies to (from `/api/products`). |
| `id_product_attribute` | Specific combination/variant. `0` = applies to the base product and all combinations. |
| `id_currency` | Currency restriction. `0` = all currencies. |
| `id_country` | Country restriction. `0` = all countries. |
| `id_group` | Customer group restriction. `0` = all groups. |
| `id_customer` | Personalised price for a single customer. `0` = all customers. |
| `id_specific_price_rule` | If this record was auto-generated from a Specific Price Rule, this field stores the parent rule id. `0` for manually created prices. |
| `price` | Fixed override price (tax-excl). `-1` = do not override the base price, just apply the reduction. |
| `from_quantity` | Minimum quantity in cart for this price to activate. `1` = always active. |
| `reduction` | Discount value (percentage 0–1, or absolute amount). `0` = no reduction. |
| `reduction_tax` | For `amount` reductions: `1` = amount is tax-included, `0` = tax-excluded. |
| `reduction_type` | `percentage` or `amount`. |
| `from` | Validity start (`YYYY-MM-DD HH:MM:SS`). Empty = no constraint. |
| `to` | Validity end. Empty = no constraint. |

---

## 6. How Price Reduction Is Computed for a Product

PrestaShop applies the following logic when resolving the final customer price:

### Step 1 — Determine the base price

```
base_price = catalog product price (tax-excluded)
```

### Step 2 — Check for a fixed override

```
if specific_price.price != -1:
    working_price = specific_price.price   ← completely replaces catalog price
else:
    working_price = base_price
```

### Step 3 — Apply the reduction

```
if reduction_type == "percentage":
    final_price = working_price × (1 - reduction)
    # e.g. reduction = 0.15  →  15% off

if reduction_type == "amount":
    if reduction_tax == 1:
        # reduction amount is tax-included; convert to tax-excl before subtracting
        final_price = working_price - (reduction / (1 + tax_rate))
    else:
        final_price = working_price - reduction
```

### Step 4 — Apply tax for display

```
display_price = final_price × (1 + tax_rate)
```

### Priority / conflict resolution

When multiple specific prices match the same product + context, PrestaShop picks the one resulting in the **lowest final price** for the customer (most favourable). Specificity (e.g., a price targeting one customer) does not automatically win over a broader rule — price amount wins.

---

## 7. Creating a Specific Price via API — Example

### 7a. 15% discount on product #42 for everyone

```http
POST /api/specific_prices
Content-Type: application/xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <specific_price>
    <id_shop>1</id_shop>
    <id_shop_group>0</id_shop_group>
    <id_cart>0</id_cart>
    <id_product>42</id_product>
    <id_product_attribute>0</id_product_attribute>
    <id_currency>0</id_currency>
    <id_country>0</id_country>
    <id_group>0</id_group>
    <id_customer>0</id_customer>
    <id_specific_price_rule>0</id_specific_price_rule>
    <price>-1</price>
    <from_quantity>1</from_quantity>
    <reduction>0.15</reduction>
    <reduction_tax>1</reduction_tax>
    <reduction_type>percentage</reduction_type>
    <from>0000-00-00 00:00:00</from>
    <to>0000-00-00 00:00:00</to>
  </specific_price>
</prestashop>
```

### 7b. Fixed price of €9.99 for product #42, minimum 5 units, valid for a period

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <specific_price>
    <id_shop>1</id_shop>
    <id_shop_group>0</id_shop_group>
    <id_cart>0</id_cart>
    <id_product>42</id_product>
    <id_product_attribute>0</id_product_attribute>
    <id_currency>0</id_currency>
    <id_country>0</id_country>
    <id_group>0</id_group>
    <id_customer>0</id_customer>
    <id_specific_price_rule>0</id_specific_price_rule>
    <price>9.990000</price>
    <from_quantity>5</from_quantity>
    <reduction>0</reduction>
    <reduction_tax>1</reduction_tax>
    <reduction_type>percentage</reduction_type>
    <from>2025-06-01 00:00:00</from>
    <to>2025-06-30 23:59:59</to>
  </specific_price>
</prestashop>
```

### 7c. Creating a Specific Price Rule (catalog-wide 10% off)

```http
POST /api/specific_price_rules
Content-Type: application/xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <specific_price_rule>
    <id_shop>1</id_shop>
    <id_country>0</id_country>
    <id_currency>0</id_currency>
    <id_group>0</id_group>
    <name>Summer Sale 10%</name>
    <from_quantity>1</from_quantity>
    <price>-1</price>
    <reduction>0.10</reduction>
    <reduction_tax>1</reduction_tax>
    <reduction_type>percentage</reduction_type>
    <from>2025-07-01 00:00:00</from>
    <to>2025-07-31 23:59:59</to>
  </specific_price_rule>
</prestashop>
```

> ⚠️ After creating a rule via API, you must apply it to products through the PrestaShop back-office or via the dedicated `applyToProducts` mechanism, otherwise no `specific_price` rows are generated.

---

## 8. Common Pitfalls

| Issue | Explanation |
|---|---|
| `price = 0` instead of `price = -1` | Setting price to `0` makes the product free. Use `-1` to "not override" the base price. |
| `reduction = 1` for 100% off | A percentage reduction of `1` means 100% — the product becomes free. |
| `reduction_tax` ignored for percentage | The `reduction_tax` field is only meaningful for `amount` type reductions. |
| Date format | Always use `YYYY-MM-DD HH:MM:SS`. Empty validity means `0000-00-00 00:00:00`. |
| Scope `0` means "all" | For `id_country`, `id_currency`, `id_group`, `id_customer`: `0` is a wildcard meaning no restriction. |
| Rule vs Price confusion | A `specific_price_rule` alone does nothing at checkout — it only works once materialised into `specific_price` rows per product. |
