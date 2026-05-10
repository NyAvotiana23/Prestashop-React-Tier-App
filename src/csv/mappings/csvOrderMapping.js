import {cleanEmptyFields, parseCsvNumber} from "../csvImportUtils.js";

const REQUIRED_ORDER_HEADERS = [
    "id_address_delivery",
    "id_address_invoice",
    "id_cart",
    "id_currency",
    "id_lang",
    "id_customer",
    "id_carrier",
    "module",
    "payment",
    "total_paid",
    "total_paid_real",
    "total_products",
    "total_products_wt",
    "conversion_rate",
    "order_details"
];

const ORDER_ROW_KEYS = [
    "id",
    "product_id",
    "product_attribute_id",
    "product_quantity",
    "product_name",
    "product_reference",
    "product_ean13",
    "product_isbn",
    "product_upc",
    "product_price",
    "id_customization",
    "unit_price_tax_incl",
    "unit_price_tax_excl",
];

function requireValue(row, header) {
    const value = row?.[header];
    if (value === null || value === undefined || String(value).trim() === "") {
        throw new Error(`Missing required field: ${header}`);
    }
    return String(value).trim();
}

function requireNumber(row, header, options) {
    const raw = requireValue(row, header);
    const parsed = parseCsvNumber(raw, options);
    if (parsed === "") {
        throw new Error(`Invalid numeric field: ${header}`);
    }
    return parsed;
}

function parseOrderDetails(rawValue, options) {
    const decimalSeparator = options.decimalSeparator ?? ".";
    const separator = options.orderDetailsSeparator ?? ";";
    const raw = requireValue({order_details: rawValue}, "order_details");
    const entries = String(raw)
        .split(separator)
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (entries.length === 0) {
        throw new Error("order_details must contain at least one JSON object");
    }

    return entries.map((entry, index) => {
        let parsed;
        try {
            parsed = JSON.parse(entry);
        } catch (error) {
            throw new Error(`Invalid order_details JSON at index ${index + 1}`);
        }

        if (!parsed || typeof parsed !== "object") {
            throw new Error(`order_details entry ${index + 1} must be an object`);
        }

        const detail = {};
        for (const key of ORDER_ROW_KEYS) {
            if (parsed[key] !== undefined && parsed[key] !== null && String(parsed[key]).trim() !== "") {
                detail[key] = parsed[key];
            }
        }

        if (detail.product_name === undefined || String(detail.product_name).trim() === "") {
            throw new Error(`Missing required order_details field: product_name (item ${index + 1})`);
        }

        if (detail.product_quantity !== undefined) {
            detail.product_quantity = requireNumber({product_quantity: detail.product_quantity}, "product_quantity", {
                decimalSeparator,
            });
        } else {
            throw new Error(`Missing required order_details field: product_quantity (item ${index + 1})`);
        }

        if (detail.product_price !== undefined) {
            detail.product_price = requireNumber({product_price: detail.product_price}, "product_price", {
                decimalSeparator,
            });
        } else {
            throw new Error(`Missing required order_details field: product_price (item ${index + 1})`);
        }

        if (detail.unit_price_tax_incl !== undefined) {
            detail.unit_price_tax_incl = parseCsvNumber(detail.unit_price_tax_incl, {decimalSeparator});
        }

        if (detail.unit_price_tax_excl !== undefined) {
            detail.unit_price_tax_excl = parseCsvNumber(detail.unit_price_tax_excl, {decimalSeparator});
        }

        return cleanEmptyFields(detail);
    });
}

export function mapOrderRowToPayload(row, options = {}) {
    const decimalSeparator = options.decimalSeparator ?? ".";

    for (const header of REQUIRED_ORDER_HEADERS) {
        requireValue(row, header);
    }

    const payload = {
        order: {
            id_address_delivery: requireValue(row, "id_address_delivery"),
            id_address_invoice: requireValue(row, "id_address_invoice"),
            id_cart: requireValue(row, "id_cart"),
            id_currency: requireValue(row, "id_currency"),
            id_lang: requireValue(row, "id_lang"),
            id_customer: requireValue(row, "id_customer"),
            id_carrier: requireValue(row, "id_carrier"),
            module: requireValue(row, "module"),
            payment: requireValue(row, "payment"),
            total_paid: requireNumber(row, "total_paid", {decimalSeparator}),
            total_paid_real: requireNumber(row, "total_paid_real", {decimalSeparator}),
            total_products: requireNumber(row, "total_products", {decimalSeparator}),
            total_products_wt: requireNumber(row, "total_products_wt", {decimalSeparator}),
            conversion_rate: requireNumber(row, "conversion_rate", {decimalSeparator}),
            associations: {
                order_rows: {
                    order_row: parseOrderDetails(row["order_details"], {
                        decimalSeparator,
                        orderDetailsSeparator: options.orderDetailsSeparator,
                    }),
                },
            },
        },
    };

    return cleanEmptyFields(payload);
}

