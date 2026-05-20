import {getList} from "../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../utils/util-functions.js";

const PRODUCT_CACHE = new Map();
const COMBO_CACHE = new Map();
const TAX_RATE_CACHE = new Map();
const CART_VALUE_CACHE = new Map();

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

function normalizeCarts(response) {
    return ensureArray(response?.data?.carts?.cart ?? response?.data?.carts ?? []);
}

export function getCartRows(cart) {
    const rows = cart?.associations?.cart_rows?.cart_row ?? cart?.associations?.cart_rows ?? [];
    return ensureArray(rows);
}

function toFloat(val) {
    const n = parseFloat(getScalarValue(val) ?? "");
    return Number.isFinite(n) ? n : 0;
}

function sumField(items, field) {
    return items.reduce((acc, item) => acc + toFloat(item?.[field]), 0);
}

async function fetchTaxRate(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;
    if (TAX_RATE_CACHE.has(taxRulesGroupId)) return TAX_RATE_CACHE.get(taxRulesGroupId);

    const rulesRes = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit: "0,1",
    });
    const rule = ensureArray(rulesRes?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) {
        TAX_RATE_CACHE.set(taxRulesGroupId, 0);
        return 0;
    }

    const taxRes = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit: "0,1",
    });
    const tax = ensureArray(taxRes?.data?.taxes?.tax ?? [])[0];
    const rate = parseFloat(getScalarValue(tax?.rate) ?? "0") || 0;

    TAX_RATE_CACHE.set(taxRulesGroupId, rate);
    return rate;
}

async function fetchProductBase(productId) {
    if (PRODUCT_CACHE.has(productId)) return PRODUCT_CACHE.get(productId);

    const res = await getList("products", {
        display: "full",
        filters: {id: productId},
        limit: "0,1",
    });
    const product = ensureArray(res?.data?.products?.product ?? [])[0];
    if (!product) {
        PRODUCT_CACHE.set(productId, null);
        return null;
    }

    const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;
    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate = await fetchTaxRate(taxRulesGroupId);

    const entry = {baseHt, taxRate};
    PRODUCT_CACHE.set(productId, entry);
    return entry;
}

async function fetchComboDelta(combinationId) {
    if (!combinationId || combinationId === "0") return 0;
    if (COMBO_CACHE.has(combinationId)) return COMBO_CACHE.get(combinationId);

    const res = await getList("combinations", {
        display: "full",
        filters: {id: combinationId},
        limit: "0,1",
    });
    const combo = ensureArray(res?.data?.combinations?.combination ?? [])[0];
    const delta = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;

    COMBO_CACHE.set(combinationId, delta);
    return delta;
}

async function computeCartValue(cart) {
    const cartId = String(getScalarValue(cart?.id));
    if (CART_VALUE_CACHE.has(cartId)) return CART_VALUE_CACHE.get(cartId);

    const rows = getCartRows(cart);
    let value_ttc = 0;
    let value_ht = 0;

    for (const row of rows) {
        const productId = getScalarValue(row?.id_product);
        const combinationId = getScalarValue(row?.id_product_attribute) || "0";
        const quantity = parseInt(getScalarValue(row?.quantity) ?? "1", 10) || 1;

        const base = await fetchProductBase(productId);
        if (!base) continue;

        const delta = await fetchComboDelta(combinationId);
        const effectiveHt = base.baseHt + delta;
        const lineTtc = effectiveHt * (1 + base.taxRate / 100) * quantity;
        const lineHt = effectiveHt * quantity;

        value_ttc += lineTtc;
        value_ht += lineHt;
    }

    const result = {value_ttc, value_ht};
    CART_VALUE_CACHE.set(cartId, result);
    return result;
}

export async function buildCartStats(carts) {
    const values = await Promise.all(carts.map(computeCartValue));

    let value_ttc = 0;
    let value_ht = 0;
    for (const v of values) {
        if (!v) continue;
        value_ttc += v.value_ttc;
        value_ht += v.value_ht;
    }

    return {count: carts.length, value_ttc, value_ht};
}

export function buildOrderStats(orders) {
    return {
        count: orders.length,
        total_paid: sumField(orders, "total_paid"),
        total_paid_real: sumField(orders, "total_paid_real"),
        total_tax_incl: sumField(orders, "total_paid_tax_incl"),
        total_tax_excl: sumField(orders, "total_paid_tax_excl"),
    };
}

export function isValidOrder(order, validStates) {
    const state = String(getScalarValue(order?.current_state) ?? "");
    return validStates.has(state);
}

export function collectOrderDates(orders) {
    const dates = new Set();
    for (const order of orders) {
        const day = getScalarValue(order?.date_add)?.split(" ")[0];
        if (day) dates.add(day);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

export async function loadDashboardData({signal} = {}) {
    const [ordersRes, cartsRes] = await Promise.all([
        getList("orders", {display: "full", sort: "[id_ASC]", signal}),
        getList("carts", {display: "full", sort: "[id_ASC]", signal}),
    ]);

    if (!ordersRes?.data) {
        throw new Error("Invalid orders response");
    }

    const orders = normalizeOrders(ordersRes?.data);
    const carts = normalizeCarts(cartsRes);
    const dates = collectOrderDates(orders);

    return {orders, carts, dates};
}

export async function fetchOrdersByDate(date, {signal} = {}) {
    const response = await getList("orders", {
        display: "full",
        sort: "[id_ASC]",
        params: {
            "filter[date_add]": `[${date} 00:00:00,${date} 23:59:59]`,
            date: 1,
        },
        signal,
    });

    if (!response?.data) {
        throw new Error("Invalid orders response");
    }

    return normalizeOrders(response?.data);
}

export function filterCartsByDate(carts, date) {
    return carts.filter((cart) => {
        const day = getScalarValue(cart?.date_add)?.split(" ")[0];
        return day === date;
    });
}

