import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getList, patchResource} from "../../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import {createStockMvt} from "../../csv/mappings/csvMappingUtils.js";
import {getDateTimeString, parseDateToString} from "../../utils/date-utils.jsx";

// ─── Normalisers ────────────────────────────────────────────────────────────

function normalizeProducts(data) {
    if (!data || typeof data !== "object") return [];
    const productsNode = data?.products?.product ?? data?.products ?? data?.product ?? [];
    return ensureArray(productsNode);
}

function normalizeStockAvailables(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.stock_availables?.stock_available ?? data?.stock_availables ?? data?.stock_available ?? [];
    return ensureArray(node);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getQtyColor(qty) {
    const n = Number(qty);
    if (n < 0) return {
        row: "bg-red-50",
        badge: "bg-red-100 text-red-700 border border-red-200",
        dot: "bg-red-500",
        text: "text-red-700",
    };
    if (n === 0) return {
        row: "bg-yellow-50",
        badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
        dot: "bg-yellow-400",
        text: "text-yellow-700",
    };
    return {
        row: "",
        badge: "bg-green-100 text-green-700 border border-green-200",
        dot: "bg-green-500",
        text: "text-green-700",
    };
}

function formatPriceTe(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed.toFixed(6) : "0.000000";
}

function toDateTimeLocalValue(dateTimeStr) {
    if (!dateTimeStr) return "";
    const withT = dateTimeStr.includes(" ") ? dateTimeStr.replace(" ", "T") : dateTimeStr;
    return withT.slice(0, 16);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuantityBadge({qty}) {
    const colors = getQtyColor(qty);
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold ${colors.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${Number(qty) > 0 ? "animate-pulse" : ""}`}/>
            {qty}
        </span>
    );
}

// ─── PatchModal ───────────────────────────────────────────────────────────────

function PatchModal({stock, productRef, variantLabel, onClose, onPatch}) {
    const [delta, setDelta] = useState("");
    const [dateAdd, setDateAdd] = useState(toDateTimeLocalValue(getDateTimeString()));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentQty = Number(getScalarValue(stock?.quantity) ?? 0);
    const deltaNum = delta === "" || delta === "-" ? 0 : Number(delta);
    const preview = currentQty + deltaNum;
    const previewColors = getQtyColor(preview);

    async function handleSubmit() {
        if (delta === "" || isNaN(Number(delta))) return;
        if (deltaNum === 0) {
            setError("La quantité ne peut pas être nulle.");
            return;
        }
        const normalizedDate = parseDateToString(dateAdd, "YYYY-MM-DDTHH:mm");
        if (!normalizedDate) {
            setError("Date invalide. Utilisez une date valide.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const stockId = getScalarValue(stock?.id);
            const productId = getScalarValue(stock?.id_product);
            const attrId = getScalarValue(stock?.id_product_attribute) || "0";
            if (!productId) {
                throw new Error("Id produit introuvable.");
            }

            const productResponse = await getList("products", {
                display: "[id,wholesale_price]",
                filters: {id: productId},
                limit: "0,1",
            });
            const product = normalizeProducts(productResponse?.data ?? productResponse)[0];
            const wholesalePrice = getScalarValue(product?.wholesale_price);
            const priceTe = deltaNum < 0 ? "0.000000" : formatPriceTe(wholesalePrice);

            const newQty = currentQty + Number(delta);
            await patchResource("stock_availables", stockId, {
                stock_available: {
                    id: stockId,
                    id_product: productId,
                    id_product_attribute: attrId,
                    quantity: String(newQty),
                    depends_on_stock: getScalarValue(stock?.depends_on_stock) || "0",
                    out_of_stock: getScalarValue(stock?.out_of_stock) || "0",
                },
            });

            onPatch(stockId, newQty);

            await createStockMvt({
                id_product: productId,
                id_product_attribute: attrId,
                id_stock: stockId,
                date_add: normalizedDate,
                quantity: String(deltaNum),
                price_te: priceTe,
            }, "Ajustement stock");

            onClose();
        } catch (err) {
            setError(err?.message ?? "La mise à jour a échoué");
        } finally {
            setLoading(false);
        }
    }

    const productId = getScalarValue(stock?.id_product);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
            <div
                className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-gray-800 font-semibold text-lg">Ajuster le stock</h3>
                    <button onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none">&times;</button>
                </div>

                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    {/* Show reference if available, fall back to raw id */}
                    <p className="text-gray-400 text-xs font-medium mb-0.5">
                        Produit{" "}
                        {productRef
                            ? <span className="font-mono text-gray-600">{productRef}</span>
                            : <span className="font-mono">#{productId}</span>
                        }
                    </p>
                    {/* Show variant label when present */}
                    {variantLabel && (
                        <p className="text-xs text-purple-600 font-medium mb-1">{variantLabel}</p>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">Stock actuel :</span>
                        <QuantityBadge qty={currentQty}/>
                    </div>
                </div>

                <label className="block text-sm font-medium text-gray-600 mb-1.5">Date du mouvement</label>
                <input
                    type="datetime-local"
                    value={dateAdd}
                    onChange={e => setDateAdd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />

                <label className="block text-sm font-medium text-gray-600 mb-1.5 mt-4">Quantité à ajouter</label>
                <input
                    type="number"
                    value={delta}
                    onChange={e => setDelta(e.target.value)}
                    placeholder="ex: 10 ou -5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />

                {delta !== "" && !isNaN(Number(delta)) && delta !== "-" && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Nouveau stock :</span>
                        <QuantityBadge qty={preview}/>
                        <span className={`text-xs font-mono ml-auto ${previewColors.text}`}>
                            {currentQty} {Number(delta) >= 0 ? "+" : ""}{delta} = {preview}
                        </span>
                    </div>
                )}

                {error && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || delta === "" || isNaN(Number(delta)) || delta === "-"}
                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Mise à jour…
                            </span>
                        ) : "Confirmer"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── StockRow ─────────────────────────────────────────────────────────────────

function StockRow({stock, productRef, variantLabel, onEdit}) {
    const qty = Number(getScalarValue(stock?.quantity) ?? 0);
    const colors = getQtyColor(qty);
    const productId = getScalarValue(stock?.id_product);
    const attrId = getScalarValue(stock?.id_product_attribute);
    const location = getScalarValue(stock?.location);

    return (
        <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors group ${colors.row}`}>
            {/* Stock ID */}
            <td className="px-4 py-3 text-gray-400 text-sm font-mono">{getScalarValue(stock?.id)}</td>

            {/* Product — show reference if cached, otherwise fall back to #id */}
            <td className="px-4 py-3 text-gray-800 text-sm font-medium">
                {productRef
                    ? <span className="font-mono">{productRef}</span>
                    : <span className="text-gray-500 font-mono">#{productId}</span>
                }
            </td>

            {/* Variant — show human-readable label if cached, otherwise #attrId */}
            <td className="px-4 py-3">
                {attrId && attrId !== "0" ? (
                    variantLabel
                        ? <span
                            className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                            {variantLabel}
                          </span>
                        : <span
                            className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-mono">
                            #{attrId}
                          </span>
                ) : (
                    <span className="text-gray-300 text-xs">—</span>
                )}
            </td>

            <td className="px-4 py-3">
                <QuantityBadge qty={qty}/>
            </td>
            <td className="px-4 py-3 text-gray-500 text-sm">
                {location || <span className="text-gray-300">—</span>}
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                    getScalarValue(stock?.depends_on_stock) === "1"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-400"
                }`}>
                    {getScalarValue(stock?.depends_on_stock) === "1" ? "oui" : "non"}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={() => onEdit(stock)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                >
                    Modifier
                </button>
            </td>
        </tr>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function StockAvailable() {
    const [stockAvailable, setStockAvailable] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [editingStock, setEditingStock] = useState(null);
    const [search, setSearch] = useState("");

    // ── Cache maps (useRef = no re-render on write) ───────────────────────────
    // productId  → reference string  (e.g. "REF-001")
    const productRefCache = useRef({});
    // combinationId (= id_product_attribute) → human-readable label string
    const variantLabelCache = useRef({});

    // Trigger a re-render after caches are populated so rows update.
    const [cacheVersion, setCacheVersion] = useState(0);
    const bumpCache = useCallback(() => setCacheVersion(v => v + 1), []);

    // ── Load stocks ───────────────────────────────────────────────────────────
    const load = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);

            // 1. Fetch all product IDs
            const productIdsResponse = await getList("products", {
                display: "[id]",
                sort: "[id_ASC]",
                signal,
            });
            const productResult = normalizeProducts(productIdsResponse?.data ?? productIdsResponse);
            const idStr = productResult.map(p => getScalarValue(p?.id)).join("|");

            if (!idStr) {
                setStockAvailable([]);
                setStatus("success");
                return;
            }

            // 2. Fetch all stock_availables for those products
            const stockResponse = await getList("stock_availables", {
                display: "full",
                sort: "[id_ASC]",
                filters: {id_product: `[${idStr}]`},
                signal,
            });

            const stockResult = normalizeStockAvailables(stockResponse?.data ?? stockResponse);
            setStockAvailable(stockResult);
            setStatus("success");

            // 3. Enrich caches asynchronously — do NOT block the UI
            enrichCaches(stockResult, signal);

        } catch (err) {
            if (isAbortError(err)) return;
            setError(err?.message ?? "Erreur inconnue");
            setStatus("error");
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cache enrichment ──────────────────────────────────────────────────────
    /**
     * Two-step enrichment, mirrors FrontProductDetail's pattern:
     *
     * Step A — Product references:
     *   Collect all uncached product IDs → one batch getList("products", display=[id,reference])
     *
     * Step B — Variant labels:
     *   Collect all uncached combination IDs → one batch getList("combinations", display=full)
     *   → collect all product_option_value IDs → one batch getList("product_option_values")
     *   → collect all attribute group IDs     → one batch getList("product_options")
     *   → build "Group: Value · Group: Value" label strings
     *
     * Both steps write into their respective useRef caches and then call bumpCache()
     * once so the component re-renders a single time after each step completes.
     */
    async function enrichCaches(stocks, signal) {
        await enrichProductRefs(stocks, signal);
        await enrichVariantLabels(stocks, signal);
    }

    async function enrichProductRefs(stocks, signal) {
        // Collect product IDs not yet in cache
        const missingIds = [
            ...new Set(
                stocks
                    .map(s => getScalarValue(s?.id_product))
                    .filter(id => id && productRefCache.current[id] === undefined)
            )
        ];
        if (!missingIds.length) return;

        // Pre-populate with null so parallel calls don't duplicate requests
        missingIds.forEach(id => { productRefCache.current[id] = null; });

        try {
            const response = await getList("products", {
                display: "[id,reference]",
                filters: {id: `[${missingIds.join("|")}]`},
                limit: `0,${missingIds.length}`,
                signal,
            });
            const products = normalizeProducts(response?.data ?? response);
            products.forEach(p => {
                const id = getScalarValue(p?.id);
                const ref = getScalarValue(p?.reference);
                if (id) productRefCache.current[id] = ref || `#${id}`;
            });
            bumpCache();
        } catch (err) {
            if (isAbortError(err)) return;
            // On failure just leave nulls — rows fall back to #id display
        }
    }

    async function enrichVariantLabels(stocks, signal) {
        // Collect combination IDs (id_product_attribute != "0") not yet cached
        const missingAttrIds = [
            ...new Set(
                stocks
                    .map(s => getScalarValue(s?.id_product_attribute))
                    .filter(id => id && id !== "0" && variantLabelCache.current[id] === undefined)
            )
        ];
        if (!missingAttrIds.length) return;

        // Pre-populate with null to avoid duplicate fetches
        missingAttrIds.forEach(id => { variantLabelCache.current[id] = null; });

        try {
            // Step B-1: Fetch combinations in one batch
            const combResponse = await getList("combinations", {
                display: "full",
                filters: {id: `[${missingAttrIds.join("|")}]`},
                limit: `0,${missingAttrIds.length}`,
                signal,
            });
            const combinations = ensureArray(
                combResponse?.data?.combinations?.combination ?? []
            );

            // Step B-2: Collect all option value IDs across all combinations
            const optionValueIds = new Set();
            combinations.forEach(comb => {
                const values = ensureArray(
                    comb?.associations?.product_option_values?.product_option_value ?? []
                );
                values.forEach(v => {
                    const vid = getScalarValue(v?.id ?? v);
                    if (vid) optionValueIds.add(vid);
                });
            });

            if (!optionValueIds.size) return;

            // Step B-3: Fetch option values in one batch
            const ovResponse = await getList("product_option_values", {
                display: "full",
                filters: {id: `[${[...optionValueIds].join("|")}]`},
                limit: `0,${optionValueIds.size}`,
                signal,
            });
            const optionValues = ensureArray(
                ovResponse?.data?.product_option_values?.product_option_value ?? []
            );

            // Build valueId → { name, groupId } map
            const optionValueMap = {};
            const groupIds = new Set();
            optionValues.forEach(ov => {
                const ovId = getScalarValue(ov?.id);
                const groupId = getScalarValue(ov?.id_attribute_group);
                if (ovId) {
                    optionValueMap[String(ovId)] = {
                        name: getLanguageText(ov?.name) || String(ovId),
                        groupId: groupId ? String(groupId) : "",
                    };
                }
                if (groupId) groupIds.add(String(groupId));
            });

            // Step B-4: Fetch attribute groups in one batch
            const optionGroupMap = {};
            if (groupIds.size > 0) {
                const grpResponse = await getList("product_options", {
                    display: "full",
                    filters: {id: `[${[...groupIds].join("|")}]`},
                    limit: `0,${groupIds.size}`,
                    signal,
                });
                const groups = ensureArray(
                    grpResponse?.data?.product_options?.product_option ?? []
                );
                groups.forEach(g => {
                    const gid = getScalarValue(g?.id);
                    if (gid) {
                        optionGroupMap[String(gid)] = getLanguageText(g?.name) || `Option ${gid}`;
                    }
                });
            }

            // Step B-5: Build label strings and store in cache
            combinations.forEach(comb => {
                const combId = getScalarValue(comb?.id);
                if (!combId) return;

                const values = ensureArray(
                    comb?.associations?.product_option_values?.product_option_value ?? []
                );
                const parts = values
                    .map(v => {
                        const vid = getScalarValue(v?.id ?? v);
                        const ov = optionValueMap[String(vid)];
                        if (!ov) return null;
                        const groupName = optionGroupMap[ov.groupId] || "";
                        return groupName ? `${groupName}: ${ov.name}` : ov.name;
                    })
                    .filter(Boolean);

                variantLabelCache.current[String(combId)] = parts.length
                    ? parts.join(" · ")
                    : `#${combId}`;
            });

            bumpCache();
        } catch (err) {
            if (isAbortError(err)) return;
            // On failure leave nulls — rows fall back to #attrId display
        }
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    // ── Patch handler ─────────────────────────────────────────────────────────
    function handlePatch(stockId, newQty) {
        setStockAvailable(prev =>
            prev.map(s =>
                getScalarValue(s?.id) === stockId
                    ? {...s, quantity: String(newQty)}
                    : s
            )
        );
    }

    // ── Derived data ──────────────────────────────────────────────────────────
    const combinationProductIds = new Set(
        stockAvailable
            .filter(s => {
                const attrId = getScalarValue(s?.id_product_attribute) || "0";
                return attrId !== "0";
            })
            .map(s => getScalarValue(s?.id_product))
    );

    const visibleStocks = stockAvailable.filter(s => {
        const productId = getScalarValue(s?.id_product);
        const attrId = getScalarValue(s?.id_product_attribute) || "0";
        if (attrId !== "0") return true;
        return !combinationProductIds.has(productId);
    });

    const filtered = !search.trim()
        ? visibleStocks
        : visibleStocks.filter(s => {
            const q = search.toLowerCase();
            const productId = getScalarValue(s?.id_product);
            const ref = productRef(s);
            const attrId = getScalarValue(s?.id_product_attribute) || "0";
            const label = variantLabel(s);
            return (
                getScalarValue(s?.id).includes(q) ||
                productId.includes(q) ||
                (ref && ref.toLowerCase().includes(q)) ||
                (label && label.toLowerCase().includes(q)) ||
                getScalarValue(s?.location).toLowerCase().includes(q)
            );
        });

    // Convenience lookups into caches
    function productRef(stock) {
        const id = getScalarValue(stock?.id_product);
        return productRefCache.current[id] ?? null;
    }

    function variantLabel(stock) {
        const attrId = getScalarValue(stock?.id_product_attribute) || "0";
        if (attrId === "0") return null;
        return variantLabelCache.current[attrId] ?? null;
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    const total = visibleStocks.length;
    const negative = visibleStocks.filter(s => Number(getScalarValue(s?.quantity)) < 0).length;
    const zero = visibleStocks.filter(s => Number(getScalarValue(s?.quantity)) === 0).length;
    const positive = visibleStocks.filter(s => Number(getScalarValue(s?.quantity)) > 0).length;
    const totalQuantity = visibleStocks.reduce((acc, item) => acc + Number(getScalarValue(item?.quantity) ?? 0), 0);

    // ── Render states ─────────────────────────────────────────────────────────
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-gray-500 text-sm">Chargement des stocks…</p>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
                    <p className="font-semibold mb-1">Erreur de chargement</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // ── Full render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Stock disponible</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total entrées</p>
                    <p className="text-2xl font-bold text-gray-800">{total}</p>
                </div>
                <div className="bg-green-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">En stock</p>
                    <p className="text-2xl font-bold text-green-700">{positive}</p>
                </div>
                <div className="bg-green-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">En stock quantité total</p>
                    <p className="text-2xl font-bold text-green-700">{totalQuantity}</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Épuisé</p>
                    <p className="text-2xl font-bold text-yellow-700">{zero}</p>
                </div>
                <div className="bg-red-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Négatif</p>
                    <p className="text-2xl font-bold text-red-700">{negative}</p>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h2 className="text-lg font-semibold text-gray-700 flex-1">Entrées de stock</h2>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Ref, variante, emplacement…"
                            className="border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => {
                            // Clear caches on manual refresh so data is re-fetched
                            productRefCache.current = {};
                            variantLabelCache.current = {};
                            const c = new AbortController();
                            load(c.signal);
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200">
                            {["ID Stock", "Produit", "Variante", "Quantité", "Emplacement", "Dépend stock", ""].map(h => (
                                <th key={h}
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                                    Aucun résultat
                                </td>
                            </tr>
                        ) : (
                            filtered.map(stock => (
                                <StockRow
                                    key={getScalarValue(stock?.id)}
                                    stock={stock}
                                    productRef={productRef(stock)}
                                    variantLabel={variantLabel(stock)}
                                    onEdit={setEditingStock}
                                />
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <p className="text-gray-400 text-xs mt-4 text-right">
                        {filtered.length} / {total} entrées · Survolez une ligne pour modifier
                    </p>
                )}
            </div>

            {editingStock && (
                <PatchModal
                    stock={editingStock}
                    productRef={productRef(editingStock)}
                    variantLabel={variantLabel(editingStock)}
                    onClose={() => setEditingStock(null)}
                    onPatch={handlePatch}
                />
            )}
        </div>
    );
}

export default StockAvailable;