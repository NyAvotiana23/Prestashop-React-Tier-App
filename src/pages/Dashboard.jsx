import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {getList} from "../api/prestashopCrud.js";
import {ensureArray, formatMoney, getScalarValue, isAbortError} from "../utils/util-functions.js";
import Loading from "../components/shared/Loading.jsx";
import StatusBanner from "../components/shared/StatusBanner.jsx";

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

function normalizeCarts(response) {
    return ensureArray(
        response?.data?.carts?.cart ?? response?.data?.carts ?? []
    );
}

function getCartRows(cart) {
    const rows = cart?.associations?.cart_rows?.cart_row
        ?? cart?.associations?.cart_rows
        ?? [];
    return ensureArray(rows);
}

// ─── Value helpers ────────────────────────────────────────────────────────────

/** Safely parse a PrestaShop scalar to a float (0 on failure). */
function toFloat(val) {
    const n = parseFloat(getScalarValue(val) ?? "");
    return Number.isFinite(n) ? n : 0;
}

/** Sum a numeric field across an array of objects. */
function sumField(items, field) {
    return items.reduce((acc, item) => acc + toFloat(item?.[field]), 0);
}

// ─── Pricing cache (module-level, survives re-renders, reset on page reload) ──
//
// These Maps mirror the caching pattern from csvMappingUtils.js:
//   always check the cache first, store on every successful fetch.
//
// PRODUCT_CACHE     : productId  → { baseHt, taxRate }  |  null (miss)
// COMBO_CACHE       : comboId    → delta HT (float)
// TAX_RATE_CACHE    : taxGroupId → rate (float)
// CART_VALUE_CACHE  : cartId     → { value_ttc, value_ht }
//
// CART_VALUE_CACHE lets us skip recomputation when the same cart
// appears in multiple stat buckets (cart-only, cart+order, all-carts).

const PRODUCT_CACHE    = new Map();
const COMBO_CACHE      = new Map();
const TAX_RATE_CACHE   = new Map();
const CART_VALUE_CACHE = new Map();

/**
 * Returns the tax rate (%) for a tax_rules_group id.
 * Two API calls on a miss (tax_rules → taxes), result cached forever.
 */
async function fetchTaxRate(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;
    if (TAX_RATE_CACHE.has(taxRulesGroupId)) return TAX_RATE_CACHE.get(taxRulesGroupId);

    const rulesRes = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit:   "0,1",
    });
    const rule  = ensureArray(rulesRes?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) {
        TAX_RATE_CACHE.set(taxRulesGroupId, 0);
        return 0;
    }

    const taxRes = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit:   "0,1",
    });
    const tax  = ensureArray(taxRes?.data?.taxes?.tax ?? [])[0];
    const rate = parseFloat(getScalarValue(tax?.rate) ?? "0") || 0;

    TAX_RATE_CACHE.set(taxRulesGroupId, rate);
    return rate;
}

/**
 * Returns { baseHt, taxRate } for a productId.
 *   baseHt  = product.price (HT, before combination delta)
 *   taxRate = resolved from product.id_tax_rules_group
 *
 * Returns null on a product-not-found miss (also cached to avoid retries).
 */
async function fetchProductBase(productId) {
    if (PRODUCT_CACHE.has(productId)) return PRODUCT_CACHE.get(productId);

    const res     = await getList("products", {
        display: "full",
        filters: {id: productId},
        limit:   "0,1",
    });
    const product = ensureArray(res?.data?.products?.product ?? [])[0];
    if (!product) {
        PRODUCT_CACHE.set(productId, null);  // cache the miss
        return null;
    }

    const baseHt          = parseFloat(getScalarValue(product?.price) ?? "0") || 0;
    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate         = await fetchTaxRate(taxRulesGroupId);

    const entry = {baseHt, taxRate};
    PRODUCT_CACHE.set(productId, entry);
    return entry;
}

/**
 * Returns the combination price delta HT for a combinationId.
 *
 * PrestaShop stores the combination price as a DELTA relative to the base
 * product price (can be negative, zero, or positive).
 * Returns 0 when combinationId is absent or "0" (no combination on the row).
 */
async function fetchComboDelta(combinationId) {
    if (!combinationId || combinationId === "0") return 0;
    if (COMBO_CACHE.has(combinationId)) return COMBO_CACHE.get(combinationId);

    const res   = await getList("combinations", {
        display: "full",
        filters: {id: combinationId},
        limit:   "0,1",
    });
    const combo = ensureArray(res?.data?.combinations?.combination ?? [])[0];
    const delta = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;

    COMBO_CACHE.set(combinationId, delta);
    return delta;
}

/**
 * Computes { value_ttc, value_ht } for a single cart.
 *
 * Pricing rule (identical to getProductPricing + buildOrderRowsFromCart
 * in Orders.jsx and processOrderRow in csvOrderMapping.js):
 *
 *   effectiveHt = product.price + combination.price   (delta, 0 if no combo)
 *   priceTtc    = effectiveHt * (1 + taxRate / 100)
 *   line total  = price * quantity
 *
 * Result is cached in CART_VALUE_CACHE so the same cart is never repriced
 * across filter changes or across the three parallel stat buckets.
 */
async function computeCartValue(cart) {
    const cartId = String(getScalarValue(cart?.id));
    if (CART_VALUE_CACHE.has(cartId)) return CART_VALUE_CACHE.get(cartId);

    const rows = getCartRows(cart);
    let value_ttc = 0;
    let value_ht  = 0;

    for (const row of rows) {
        const productId     = getScalarValue(row?.id_product);
        const combinationId = getScalarValue(row?.id_product_attribute) || "0";
        const quantity      = parseInt(getScalarValue(row?.quantity) ?? "1", 10) || 1;

        const base = await fetchProductBase(productId);
        if (!base) continue;   // unknown product — skip row silently

        const delta       = await fetchComboDelta(combinationId);
        const effectiveHt = base.baseHt + delta;
        const lineTtc     = effectiveHt * (1 + base.taxRate / 100) * quantity;
        const lineHt      = effectiveHt * quantity;

        value_ttc += lineTtc;
        value_ht  += lineHt;
    }

    const result = {value_ttc, value_ht};
    CART_VALUE_CACHE.set(cartId, result);
    return result;
}

/**
 * Computes aggregate cart stats for a list of carts.
 * All carts are priced in parallel; CART_VALUE_CACHE ensures
 * a cart shared between two buckets is only fetched once.
 *
 * @param  {object[]} carts
 * @returns {Promise<{ count: number, value_ttc: number, value_ht: number }>}
 */
async function buildCartStats(carts) {
    const values = await Promise.all(carts.map(computeCartValue));

    let value_ttc = 0;
    let value_ht  = 0;
    for (const v of values) {
        if (!v) continue;
        value_ttc += v.value_ttc;
        value_ht  += v.value_ht;
    }

    return {count: carts.length, value_ttc, value_ht};
}

// ─── Order stats (synchronous — prices are already on order objects) ──────────

/**
 * @param  {object[]} orders
 * @returns {{ count, total_paid, total_paid_real, total_tax_incl, total_tax_excl }}
 */
function buildOrderStats(orders) {
    return {
        count:           orders.length,
        total_paid:      sumField(orders, "total_paid"),
        total_paid_real: sumField(orders, "total_paid_real"),
        total_tax_incl:  sumField(orders, "total_paid_tax_incl"),
        total_tax_excl:  sumField(orders, "total_paid_tax_excl"),
    };
}

/**
 * Collect unique order dates (YYYY-MM-DD), sorted descending.
 * Used to populate the "Available dates" dropdown.
 */
function collectOrderDates(orders) {
    const dates = new Set();
    for (const order of orders) {
        const day = getScalarValue(order?.date_add)?.split(' ')[0];
        if (day) dates.add(day);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString('en-CA');

/** Placeholder shown while async cart pricing is in progress. */
const EMPTY_CART_STATS = {count: 0, value_ttc: 0, value_ht: 0};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({label, value, colorClass = "bg-gray-50", textClass = "text-gray-800"}) {
    return (
        <div className={`${colorClass} rounded-xl p-4 text-center`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
        </div>
    );
}

function StatSection({title, children}) {
    return (
        <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                {title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {children}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function Dashboard() {
    // ── State ────────────────────────────────────────────────────────────────

    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate,   setSelectedDate]   = useState(TODAY);

    // Raw cached data — never overwritten after the initial load
    const [allOrders, setAllOrders] = useState([]);
    const [allCarts,  setAllCarts]  = useState([]);

    // Active (possibly filtered) views
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [filteredCarts,  setFilteredCarts]  = useState([]);

    // Cart stats are async (require product API calls) so they live in state
    const [cartOnlyStats,     setCartOnlyStats]     = useState(EMPTY_CART_STATS);
    const [cartAndOrderStats, setCartAndOrderStats]  = useState(EMPTY_CART_STATS);
    const [allCartStats,      setAllCartStats]       = useState(EMPTY_CART_STATS);
    const [cartStatsLoading,  setCartStatsLoading]   = useState(false);

    const [loadStatus, setLoadStatus] = useState("idle");
    const [error,      setError]      = useState(null);

    // ── Derived: cart IDs that already have an order ──────────────────────────

    const cartIdsWithOrder = useMemo(
        () => new Set(
            allOrders
                .map((o) => String(getScalarValue(o?.id_cart)))
                .filter(Boolean)
        ),
        [allOrders]
    );

    // ── Recompute cart stats whenever the filtered cart list changes ───────────
    //
    // We split into two buckets first, then fire three concurrent
    // buildCartStats calls. Because computeCartValue writes to CART_VALUE_CACHE,
    // any cart that appears in more than one bucket is priced only once.

    useEffect(() => {
        let cancelled = false;

        async function recomputeCartStats() {
            setCartStatsLoading(true);

            const cartOnly     = filteredCarts.filter(
                (c) => !cartIdsWithOrder.has(String(getScalarValue(c?.id)))
            );
            const cartAndOrder = filteredCarts.filter(
                (c) => cartIdsWithOrder.has(String(getScalarValue(c?.id)))
            );

            try {
                const [onlyStats, andOrderStats, totalStats] = await Promise.all([
                    buildCartStats(cartOnly),
                    buildCartStats(cartAndOrder),
                    buildCartStats(filteredCarts),
                ]);

                if (cancelled) return;
                setCartOnlyStats(onlyStats);
                setCartAndOrderStats(andOrderStats);
                setAllCartStats(totalStats);
            } catch (err) {
                if (cancelled) return;
                // Non-fatal: log and show stale zeros rather than crashing
                console.error("Cart stats computation failed:", err);
            } finally {
                if (!cancelled) setCartStatsLoading(false);
            }
        }

        recomputeCartStats();
        return () => { cancelled = true; };
    }, [filteredCarts, cartIdsWithOrder]);

    // ── Order stats (synchronous) ─────────────────────────────────────────────

    const orderStats = useMemo(() => buildOrderStats(filteredOrders), [filteredOrders]);

    // ── Initial data load ─────────────────────────────────────────────────────

    const loadAll = useCallback(async (signal) => {
        try {
            setLoadStatus("loading");
            setError(null);

            const [ordersRes, cartsRes] = await Promise.all([
                getList("orders", {display: "full", sort: "[id_ASC]", signal}),
                getList("carts",  {display: "full", sort: "[id_ASC]", signal}),
            ]);

            if (!ordersRes?.data) {
                setError(new Error("Invalid orders response"));
                setLoadStatus("error");
                return;
            }

            const orders = normalizeOrders(ordersRes?.data);
            const carts  = normalizeCarts(cartsRes);
            const dates  = collectOrderDates(orders);

            setAllOrders(orders);
            setAllCarts(carts);
            setFilteredOrders(orders);
            setFilteredCarts(carts);
            setAvailableDates(dates);
            setLoadStatus("success");
        } catch (err) {
            if (isAbortError(err)) return;
            setError(err);
            setLoadStatus("error");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadAll(controller.signal);
        return () => controller.abort();
    }, [loadAll]);

    // ── Filter handler ────────────────────────────────────────────────────────

    async function handleFilter(event) {
        event.preventDefault();

        const {real_date} = Object.fromEntries(new FormData(event.target).entries());
        if (!real_date) return;

        setLoadStatus("loading");
        setError(null);

        try {
            // Orders: date-filtered via the API (PS supports range filters)
            const ordersRes = await getList("orders", {
                display: "full",
                sort:    "[id_ASC]",
                params: {
                    "filter[date_add]": `[${real_date} 00:00:00,${real_date} 23:59:59]`,
                    "date": 1,
                },
            });

            if (!ordersRes?.data) {
                setError(new Error("Invalid orders response"));
                setLoadStatus("error");
                return;
            }

            const orders = normalizeOrders(ordersRes?.data);

            // Carts: no date-range filter on the PS carts endpoint — filter client-side
            const carts = allCarts.filter((c) => {
                const day = getScalarValue(c?.date_add)?.split(' ')[0];
                return day === real_date;
            });

            setFilteredOrders(orders);
            setFilteredCarts(carts);
            setLoadStatus("success");
        } catch (err) {
            setError(err);
            setLoadStatus("error");
        }
    }

    function handleReset() {
        setSelectedDate(TODAY);
        setFilteredOrders(allOrders);
        setFilteredCarts(allCarts);
    }

    // ── Render guards ─────────────────────────────────────────────────────────

    if (loadStatus === "loading") {
        return <Loading>Loading Statistics</Loading>;
    }
    if (loadStatus === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Failed to load dashboard"
                message={error?.message}
            />
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <form onSubmit={handleFilter}>
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Filters</h2>
                    <div className="flex flex-wrap gap-4 items-end">

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-600">Specific date</label>
                            <input
                                value={selectedDate}
                                type="date"
                                name="real_date"
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-600">Available dates</label>
                            <select
                                name="date_available"
                                onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">-- pick a date --</option>
                                {availableDates.map((date) => (
                                    <option key={date} value={date}>{date}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
                        >
                            Apply filters
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Statistics ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-6">
                    Statistiques
                    {cartStatsLoading && (
                        <span className="ml-3 text-sm font-normal text-gray-400 animate-pulse">
                            Calcul des paniers…
                        </span>
                    )}
                </h2>

                {/* — Orders — */}
                <StatSection title="Commandes">
                    <StatCard label="Total orders"    value={orderStats.count}                        colorClass="bg-gray-50"   textClass="text-gray-800"   />
                    <StatCard label="Total paid"      value={formatMoney(orderStats.total_paid)}      colorClass="bg-blue-50"   textClass="text-blue-700"   />
                    <StatCard label="Total paid real" value={formatMoney(orderStats.total_paid_real)} colorClass="bg-green-50"  textClass="text-green-700"  />
                    <StatCard label="Tax incl."       value={formatMoney(orderStats.total_tax_incl)}  colorClass="bg-purple-50" textClass="text-purple-700" />
                    <StatCard label="Tax excl."       value={formatMoney(orderStats.total_tax_excl)}  colorClass="bg-orange-50" textClass="text-orange-700" />
                </StatSection>

                {/* — Cart only (no order yet) — */}
                <StatSection title="Paniers seuls (sans commande)">
                    <StatCard label="Total cart only" value={cartOnlyStats.count}                  colorClass="bg-gray-50"   textClass="text-gray-800"   />
                    <StatCard label="Value TTC"       value={formatMoney(cartOnlyStats.value_ttc)} colorClass="bg-amber-50"  textClass="text-amber-700"  />
                    <StatCard label="Value HT"        value={formatMoney(cartOnlyStats.value_ht)}  colorClass="bg-yellow-50" textClass="text-yellow-700" />
                </StatSection>

                {/* — Carts that have a linked order — */}
                <StatSection title="Paniers avec commande">
                    <StatCard label="Total cart + order" value={cartAndOrderStats.count}                   colorClass="bg-gray-50" textClass="text-gray-800" />
                    <StatCard label="Value TTC"          value={formatMoney(cartAndOrderStats.value_ttc)}  colorClass="bg-teal-50" textClass="text-teal-700" />
                    <StatCard label="Value HT"           value={formatMoney(cartAndOrderStats.value_ht)}   colorClass="bg-cyan-50" textClass="text-cyan-700" />
                </StatSection>

                {/* — All carts — */}
                <StatSection title="Tous les paniers">
                    <StatCard label="Total carts" value={allCartStats.count}                    colorClass="bg-gray-50"   textClass="text-gray-800"   />
                    <StatCard label="Value TTC"   value={formatMoney(allCartStats.value_ttc)}   colorClass="bg-indigo-50" textClass="text-indigo-700" />
                    <StatCard label="Value HT"    value={formatMoney(allCartStats.value_ht)}    colorClass="bg-violet-50" textClass="text-violet-700" />
                </StatSection>
            </div>
        </div>
    );
}

export default Dashboard;