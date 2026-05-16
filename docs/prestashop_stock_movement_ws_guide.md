PrestaShop 8 — stock_mvt Field Clarifications
<sign> field
The sign field indicates the direction of the stock movement:
ValueMeaningUse case1Positive (stock IN)Restocking, supply order reception, manual addition-1Negative (stock OUT)Sale, manual removal, inventory loss
It must be either 1 or -1 — never 0. This is why the format is isInt (not isUnsignedInt).

<physical_quantity> field
This is always a positive integer, regardless of the sign. It represents the absolute quantity being moved.

If you're adding 10 units → physical_quantity = 10, sign = 1
If you're removing 10 units → physical_quantity = 10, sign = -1

The actual stock delta applied internally is: sign × physical_quantity

<id_stock> — Stock or StockAvailable?
This is id_stock from the ps_stock table — not ps_stock_available.
TablePurposeps_stockUsed by the Advanced Stock Management (warehouse system). id_stock lives here.ps_stock_availableUsed by the standard quantity system (what customers see on the front-end). Has its own id (id_stock_available).
stock_mvt is part of the Advanced Stock Management module, so:

id_stock = the ID from ps_stock (links a product/combination to a warehouse)
You cannot use an id_stock_available here — they are from a different table and context


⚠️ In PrestaShop 8, the Advanced Stock Management (ASM) feature is largely deprecated/disabled by default. If you're working with standard shop stock, you may actually need to manipulate ps_stock_available directly or via a different endpoint, since stock_mvt via the API only works when ASM is active.


Minimal valid example (adding 5 units)
xml<stock_mvt>
<id_employee><![CDATA[1]]></id_employee>
<id_stock><![CDATA[3]]></id_stock>           <!-- from ps_stock -->
<id_stock_mvt_reason><![CDATA[1]]></id_stock_mvt_reason>
<physical_quantity><![CDATA[5]]></physical_quantity>
<sign><![CDATA[1]]></sign>                   <!-- 1 = IN, -1 = OUT -->
<price_te><![CDATA[0.000000]]></price_te>
<date_add><![CDATA[2026-05-16 10:00:00]]></date_add>
</stock_mvt>Vous avez dit : And the price_te ?And the price_te ?


<price_te> — Price Tax Excluded<price_te> — Price Tax Excluded
price_te stands for Price Tax Excluded (TE = Toutes taxes Exclues in French, or simply "Tax Excluded" in English).

What it represents
It is the unit cost price of the product at the time of the stock movement, excluding taxes. It is used to calculate the Weighted Average cost (WA) of your stock.

How it's used — Weighted Average (WA) logic
PrestaShop uses this value to compute current_wa (current weighted average cost), which updates last_wa (previous weighted average) on each movement.
The formula applied internally is:
current_wa = ((existing_quantity × last_wa) + (incoming_quantity × price_te))
÷ (existing_quantity + incoming_quantity)
Example:

You have 10 units at a WA of €5.00
You receive 5 units at a cost of €8.00 (price_te = 8.000000)
New WA = ((10 × 5) + (5 × 8)) / (10 + 5) = (50 + 40) / 15 = €6.00

This is why last_wa and current_wa exist in the XML — they are snapshots of the WA before and after the movement.

Rules
SituationValue to useStock IN (restocking)The actual unit purchase cost of the itemsStock OUT (removal, sale)Usually 0.000000 — cost is not relevant for outgoing movementsManual adjustment (no known cost)0.000000 is acceptableFormatDecimal with 6 places: 8.000000

Full field-by-field breakdown of stock_mvt
Here is everything explained together:
FieldRequiredDescriptionid_product—The product ID from ps_product. Read-only on retrieval, not needed on create (derived from id_stock)id_product_attribute—The combination ID from ps_product_attribute. 0 if no combinationid_warehouse—The warehouse ID from ps_warehouse. Derived from id_stock, not always needed on createid_currency—Currency used for price_te. Typically your default shop currency IDmanagement_type—Stock valuation method: "WA" (Weighted Average) or "CUMP" (French equiv). Usually "WA"id_employee✅The employee ID performing the movement. Use 1 for adminid_stock✅The ID from ps_stock (product + warehouse combo). Not id_stock_availableid_stock_mvt_reason✅The reason ID from ps_stock_mvt_reason (e.g. 1=order, 2=missing, 3=restocking)id_order—Link to an order if this movement was caused by a sale. 0 or empty otherwiseid_supply_order—Link to a supply order if applicable. 0 or empty otherwiseproduct_name—Read-only. Product name per language. Populated automaticallyean13—Read-only. Populated from the productupc—Read-only. Populated from the productreference—Read-only. Populated from the productmpn—Read-only. Manufacturer Part Number. Populated from the productphysical_quantity✅Always positive. The absolute number of units movedsign✅1 = stock IN, -1 = stock OUTlast_wa—Read-only. The weighted average cost before this movement. Set by PrestaShopcurrent_wa—Read-only. The weighted average cost after this movement. Computed by PrestaShopprice_te✅Unit cost price excluding tax at time of movement. Use 0.000000 for outgoingdate_add✅Datetime of the movement. Format: YYYY-MM-DD HH:MM:SS

Complete realistic example — receiving 20 units at €12.50 each
xml<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<stock_mvt>
<id_employee><![CDATA[1]]></id_employee>
<id_stock><![CDATA[3]]></id_stock>
<id_stock_mvt_reason><![CDATA[3]]></id_stock_mvt_reason>
<id_order><![CDATA[0]]></id_order>
<id_supply_order><![CDATA[0]]></id_supply_order>
<id_currency><![CDATA[1]]></id_currency>
<physical_quantity><![CDATA[20]]></physical_quantity>
<sign><![CDATA[1]]></sign>
<price_te><![CDATA[12.500000]]></price_te>
<date_add><![CDATA[2026-05-16 10:00:00]]></date_add>
</stock_mvt>
</prestashop>

⚠️ Remember: stock_mvt only works if Advanced Stock Management is enabled in your PrestaShop back-office under Shop Parameters → Products → Stock. If it's disabled, ps_stock won't have data and this API resource will return empty or fail.