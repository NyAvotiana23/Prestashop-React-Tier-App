import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    buildVariantLabelMapFromCombinations,
    fetchCombinations,
    fetchProducts,
    fetchStockMovementsForProduct,
} from "../../service/stock-service.js";
import {
    ensureArray,
    formatDateTime,
    formatNumber,
    getLanguageText,
    getScalarValue,
    isAbortError,
} from "../../utils/util-functions.js";

// ─── Main component ───────────────────────────────────────────────────────────

function StockMovements() {
    // ── Product catalogue ────────────────────────────────────────────────────
    const [products, setProducts]             = useState([]);
    const [productsStatus, setProductsStatus] = useState("idle");

    // ── Filter selections ────────────────────────────────────────────────────
    const [selectedProductId, setSelectedProductId] = useState("");
    const [combinations, setCombinations]           = useState([]);
    const [selectedComboId, setSelectedComboId]     = useState(""); // "" = all, "0" = base, id = specific
    const [selectedDate, setSelectedDate]           = useState("");

    // ── Combo loading ─────────────────────────────────────────────────────────
    const [combosStatus, setCombosStatus] = useState("idle");

    // ── Variant label cache: combinationId → "Groupe: Valeur · …" ────────────
    // useRef = survives re-renders without causing one; we bump cacheVersion
    // once after enrichment completes so the dropdown re-renders with labels.
    const variantLabelCache = useRef({});
    const [cacheVersion, setCacheVersion] = useState(0);

    // ── Movements ────────────────────────────────────────────────────────────
    const [movements, setMovements]     = useState([]);
    const [fetchStatus, setFetchStatus] = useState("idle");
    const [fetchError, setFetchError]   = useState(null);
    const [hasFetched, setHasFetched]   = useState(false);

    // ── Load all products on mount ────────────────────────────────────────────
    useEffect(() => {
        const controller = new AbortController();

        async function loadProducts() {
            try {
                setProductsStatus("loading");
                const items = await fetchProducts({
                    display: "full",
                    limit: "0,1000",
                    signal: controller.signal,
                });
                setProducts(items);
                setProductsStatus("idle");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setProductsStatus("error");
            }
        }

        loadProducts();
        return () => controller.abort();
    }, []);

    // ── Load combinations + enrich variant labels when product changes ────────
    useEffect(() => {
        setCombinations([]);
        setSelectedComboId("");
        // Clear the label cache for the previous product
        variantLabelCache.current = {};
        setCacheVersion(0);

        if (!selectedProductId) return;

        const controller = new AbortController();

        async function loadCombinations() {
            try {
                setCombosStatus("loading");
                const items = await fetchCombinations({
                    display: "full",
                    filters: {id_product: selectedProductId},
                    limit: "0,200",
                    signal: controller.signal,
                });
                setCombinations(items);
                setCombosStatus("idle");

                // Enrich variant labels asynchronously — does not block the dropdown
                // from appearing; it just shows "#id" until labels arrive.
                if (items.length > 0) {
                    const labels = await buildVariantLabelMapFromCombinations(items, {
                        signal: controller.signal,
                    });
                    Object.entries(labels).forEach(([key, value]) => {
                        variantLabelCache.current[String(key)] = value;
                    });
                    setCacheVersion((v) => v + 1);
                }
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setCombosStatus("error");
            }
        }

        loadCombinations();
        return () => controller.abort();
    }, [selectedProductId]);

    // ── Reset results when any filter changes ─────────────────────────────────
    useEffect(() => {
        setMovements([]);
        setHasFetched(false);
        setFetchStatus("idle");
        setFetchError(null);
    }, [selectedProductId, selectedComboId, selectedDate]);

    // ── Fetch movements on demand (Rechercher button) ─────────────────────────
    //
    // ps_stock_mvt has NO id_product column — filtering by it causes a SQL error.
    // The correct path is:
    //   1. Fetch stocks (ps_stock) filtered by id_product [+ id_product_attribute]
    //      → gives us the list of id_stock values for this product/combo
    //   2. For each id_stock, fetch stock_movements filtered by id_stock
    //   3. Merge, sort by id DESC, optionally filter by single date client-side
    const fetchMovements = useCallback(async () => {
        if (!selectedProductId) return;

        setFetchStatus("loading");
        setFetchError(null);

        try {
            const result = await fetchStockMovementsForProduct({
                productId: selectedProductId,
                combinationId: selectedComboId,
                selectedDate,
            });

            setMovements(result);
            setFetchStatus("success");
            setHasFetched(true);
        } catch (err) {
            setFetchError(err?.message ?? "Erreur inconnue");
            setFetchStatus("error");
            setHasFetched(true);
        }
    }, [selectedProductId, selectedComboId, selectedDate]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        return movements.reduce(
            (acc, mvt) => {
                const sign  = Number(getScalarValue(mvt?.sign) ?? 1);
                const qty   = Number(getScalarValue(mvt?.physical_quantity) || 0);
                const delta = sign >= 0 ? qty : -qty;
                if (delta >= 0) acc.inQty  += delta;
                else            acc.outQty += Math.abs(delta);
                acc.net   += delta;
                acc.count += 1;
                return acc;
            },
            {inQty: 0, outQty: 0, net: 0, count: 0}
        );
    }, [movements]);

    // ── Movements grouped by calendar date (DESC) ────────────────────────────
    const byDate = useMemo(() => {
        const map = new Map();
        for (const mvt of movements) {
            const raw   = getScalarValue(mvt?.date_add);
            const day   = raw ? String(raw).slice(0, 10) : "—";
            const sign  = Number(getScalarValue(mvt?.sign) ?? 1);
            const qty   = Number(getScalarValue(mvt?.physical_quantity) || 0);
            const delta = sign >= 0 ? qty : -qty;

            if (!map.has(day)) {
                map.set(day, {date: day, count: 0, inQty: 0, outQty: 0, net: 0});
            }
            const entry = map.get(day);
            entry.count += 1;
            if (delta >= 0) entry.inQty  += delta;
            else            entry.outQty += Math.abs(delta);
            entry.net += delta;
        }
        return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
    }, [movements]);

    // ── Selected product meta ─────────────────────────────────────────────────
    const selectedProduct = useMemo(
        () => products.find((p) => getScalarValue(p?.id) === selectedProductId) ?? null,
        [products, selectedProductId]
    );

    const selectedProductLabel = selectedProduct
        ? [
            getScalarValue(selectedProduct?.reference)
                ? `[${getScalarValue(selectedProduct?.reference)}]`
                : "",
            getLanguageText(selectedProduct?.name) || `Produit ${selectedProductId}`,
        ].filter(Boolean).join(" ")
        : "";

    // ── Combo label — uses enriched cache when available ─────────────────────
    // cacheVersion in the dependency list ensures this re-evaluates after
    // enrichVariantLabels fires its onDone callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getComboLabel = useCallback((combo) => {
        if (!combo) return "";
        const cid   = getScalarValue(combo?.id);
        // 1. Prefer enriched human-readable label
        const label = variantLabelCache.current[String(cid)];
        if (label) return label;
        // 2. Fall back to reference if present
        const ref = getScalarValue(combo?.reference);
        if (ref) return `${ref} (#${cid})`;
        // 3. Last resort: bare id
        return `#${cid}`;
    }, [cacheVersion]); // re-memoize after cache is populated

    const isLoading         = fetchStatus === "loading";
    const isLoadingProducts = productsStatus === "loading";

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">

            {/* ── Header ── */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Mouvements de stock</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Selectionnez un produit puis cliquez sur <strong>Rechercher</strong>.
                </p>
            </div>

            {/* ── Filter panel ── */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Filtres</h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Product select */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-xs font-semibold uppercase text-gray-500">Produit *</label>
                        {isLoadingProducts ? (
                            <p className="text-xs text-gray-400 py-2 animate-pulse">Chargement des produits…</p>
                        ) : (
                            <select
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">— Choisir un produit —</option>
                                {products.map((p) => {
                                    const pid  = getScalarValue(p?.id);
                                    const ref  = getScalarValue(p?.reference);
                                    const name = getLanguageText(p?.name) || `Produit ${pid}`;
                                    return (
                                        <option key={pid} value={pid}>
                                            {ref ? `[${ref}] ` : ""}{name}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>

                    {/* Combination select */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">Combinaison</label>
                        {combosStatus === "loading" ? (
                            <p className="text-xs text-gray-400 py-2 animate-pulse">Chargement…</p>
                        ) : !selectedProductId ? (
                            <select
                                disabled
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                            >
                                <option>— choisir un produit d'abord —</option>
                            </select>
                        ) : combinations.length === 0 ? (
                            <select
                                disabled
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                            >
                                <option>Aucune combinaison</option>
                            </select>
                        ) : (
                            <select
                                value={selectedComboId}
                                onChange={(e) => setSelectedComboId(e.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Toutes les combinaisons</option>
                                <option value="0">Base (sans combinaison)</option>
                                {combinations.map((combo) => {
                                    const cid = getScalarValue(combo?.id);
                                    return (
                                        <option key={cid} value={cid}>
                                            {getComboLabel(combo)}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>

                    {/* Single date */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">
                            Date (optionnel)
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                    <button
                        onClick={fetchMovements}
                        disabled={!selectedProductId || isLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Recherche en cours…
                            </>
                        ) : "Rechercher"}
                    </button>

                    {hasFetched && (
                        <button
                            onClick={fetchMovements}
                            disabled={isLoading}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Actualiser
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setSelectedProductId("");
                            setSelectedComboId("");
                            setSelectedDate("");
                            setMovements([]);
                            setHasFetched(false);
                            setFetchStatus("idle");
                            setFetchError(null);
                        }}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Reinitialiser
                    </button>
                </div>
            </div>

            {/* ── Fetch error ── */}
            {fetchStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm">
                    <p className="font-semibold mb-1">Erreur de chargement</p>
                    <p>{fetchError}</p>
                </div>
            )}

            {/* ── Results block — only visible after a successful fetch ── */}
            {hasFetched && fetchStatus !== "error" && (
                <>
                    {/* Context line */}
                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-base font-semibold text-gray-800">{selectedProductLabel}</span>
                        {selectedComboId !== "" && combinations.length > 0 && (
                            <span className="text-sm text-gray-400">
                                ·{" "}
                                {selectedComboId === "0"
                                    ? "Base (sans combinaison)"
                                    : getComboLabel(combinations.find((c) => getScalarValue(c?.id) === selectedComboId))
                                }
                            </span>
                        )}
                        {selectedDate && (
                            <span className="text-sm text-gray-400">· {selectedDate}</span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">{stats.count} mouvement(s)</span>
                    </div>

                    {/* ── Stats strip ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total mouvements</p>
                            <p className="text-2xl font-bold text-gray-800">{formatNumber(stats.count)}</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Entrees</p>
                            <p className="text-2xl font-bold text-green-700">+{formatNumber(stats.inQty)}</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Sorties</p>
                            <p className="text-2xl font-bold text-red-700">−{formatNumber(stats.outQty)}</p>
                        </div>
                        <div className={`rounded-2xl shadow p-4 text-center ${stats.net >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                            <p className="text-xs text-gray-500 mb-1">Net</p>
                            <p className={`text-2xl font-bold ${stats.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                                {stats.net >= 0 ? "+" : ""}{formatNumber(stats.net)}
                            </p>
                        </div>
                    </div>

                    {/* ── Grouped by date table ── */}
                    {byDate.length > 0 && (
                        <div className="bg-white rounded-2xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-700">Résumé par date</h2>
                                <span className="text-xs text-gray-400">{byDate.length} jour(s)</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px] text-sm border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["Date", "Mouvements", "Entrées", "Sorties", "Net"].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {byDate.map(({date, count, inQty, outQty, net}) => (
                                        <tr key={date} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                                                {date !== "—"
                                                    ? new Date(date).toLocaleDateString("fr-FR", {
                                                        day:   "2-digit",
                                                        month: "2-digit",
                                                        year:  "numeric",
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {formatNumber(count)}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-green-600">
                                                {inQty > 0 ? `+${formatNumber(inQty)}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-red-600">
                                                {outQty > 0 ? `−${formatNumber(outQty)}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={net >= 0 ? "text-blue-600" : "text-orange-600"}>
                                                    {net >= 0 ? "+" : ""}{formatNumber(net)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Movements detail table ── */}
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Detail des mouvements</h2>
                            <span className="text-xs text-gray-400">{stats.count} ligne(s)</span>
                        </div>

                        {movements.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 text-sm">
                                Aucun mouvement pour cette selection.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["ID", "Date", "Stock", "Commande", "Qté", "Sens", "Prix TE"].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {movements.map((mvt, idx) => {
                                        const id      = getScalarValue(mvt?.id);
                                        const dateAdd = getScalarValue(mvt?.date_add);
                                        const stockId = getScalarValue(mvt?.id_stock);
                                        const oid     = getScalarValue(mvt?.id_order);
                                        const qty     = Number(getScalarValue(mvt?.physical_quantity) || 0);
                                        const sign    = Number(getScalarValue(mvt?.sign) ?? 1);
                                        const delta   = sign >= 0 ? qty : -qty;
                                        const priceTE = getScalarValue(mvt?.price_te);
                                        const isOut   = delta < 0;
                                        const isIn    = delta > 0;

                                        return (
                                            <tr key={id || idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                    #{id || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                    {formatDateTime(dateAdd)}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                    {stockId ? `#${stockId}` : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {oid && oid !== "0"
                                                        ? <span className="font-mono text-gray-500">#{oid}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 font-semibold">
                                                    <span className={
                                                        isOut ? "text-red-600" :
                                                            isIn  ? "text-green-600" :
                                                                "text-gray-400"
                                                    }>
                                                        {isOut ? "−" : isIn ? "+" : ""}{formatNumber(qty)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isOut ? (
                                                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                            Sortie
                                                        </span>
                                                    ) : isIn ? (
                                                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                            Entree
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                    {priceTE && priceTE !== "0.000000"
                                                        ? priceTE
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Idle placeholder — before any fetch ── */}
            {!hasFetched && fetchStatus !== "loading" && (
                <div className="bg-white rounded-2xl shadow py-20 text-center space-y-2">
                    <p className="text-gray-400 text-sm">
                        Selectionnez un produit et cliquez sur{" "}
                        <strong className="text-gray-600">Rechercher</strong>{" "}
                        pour afficher les mouvements de stock.
                    </p>
                </div>
            )}
        </div>
    );
}

export default StockMovements;