import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {formatMoney, getScalarValue, isAbortError} from "../utils/util-functions.js";
import {
    buildCartStats,
    buildOrderStats,
    collectOrderDates,
    fetchOrdersByDate,
    filterCartsByDate,
    isValidOrder,
    loadDashboardData,
} from "../service/dashboard-service.js";
import Loading from "../components/shared/Loading.jsx";
import StatusBanner from "../components/shared/StatusBanner.jsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString('en-CA');
const VALID_ORDER_STATES = new Set(["2", "5", "11"]);

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
    const validOrders = useMemo(
        () => filteredOrders.filter((order) => isValidOrder(order, VALID_ORDER_STATES)),
        [filteredOrders]
    );
    const validOrderStats = useMemo(() => buildOrderStats(validOrders), [validOrders]);

    // ── Initial data load ─────────────────────────────────────────────────────

    const loadAll = useCallback(async (signal) => {
        try {
            setLoadStatus("loading");
            setError(null);

            const result = await loadDashboardData({signal});
            const orders = result.orders;
            const carts = result.carts;
            const dates = collectOrderDates(orders);

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
            const orders = await fetchOrdersByDate(real_date);

            // Carts: no date-range filter on the PS carts endpoint — filter client-side
            const carts = filterCartsByDate(allCarts, real_date);

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

                {/* — Valid orders — */}
                <StatSection title="Commandes validées (2, 5, 11)">
                    <StatCard label="Total valid"    value={validOrderStats.count}                        colorClass="bg-gray-50"   textClass="text-gray-800"   />
                    <StatCard label="Total paid"     value={formatMoney(validOrderStats.total_paid)}      colorClass="bg-blue-50"   textClass="text-blue-700"   />
                    <StatCard label="Total paid real" value={formatMoney(validOrderStats.total_paid_real)} colorClass="bg-green-50"  textClass="text-green-700"  />
                    <StatCard label="Tax incl."      value={formatMoney(validOrderStats.total_tax_incl)}  colorClass="bg-purple-50" textClass="text-purple-700" />
                    <StatCard label="Tax excl."      value={formatMoney(validOrderStats.total_tax_excl)}  colorClass="bg-orange-50" textClass="text-orange-700" />
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