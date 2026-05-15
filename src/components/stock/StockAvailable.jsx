import React, { useEffect, useState, useCallback } from 'react';
import { getList, patchResource } from "../../api/prestashopCrud.js";
import { ensureArray, getScalarValue, isAbortError } from "../../utils/util-functions.js";

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

function getQtyColor(qty) {
    const n = Number(qty);
    if (n < 0) return { bg: "bg-red-900/40", border: "border-red-500/60", text: "text-red-300", badge: "bg-red-500/20 text-red-300 border border-red-500/40" };
    if (n === 0) return { bg: "bg-yellow-900/30", border: "border-yellow-500/60", text: "text-yellow-300", badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40" };
    return { bg: "bg-emerald-900/20", border: "border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" };
}

function QuantityBadge({ qty }) {
    const colors = getQtyColor(qty);
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-mono font-bold ${colors.badge}`}>
            {Number(qty) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />}
            {Number(qty) < 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />}
            {Number(qty) === 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />}
            {qty}
        </span>
    );
}

function PatchModal({ stock, onClose, onPatch }) {
    const [delta, setDelta] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentQty = Number(getScalarValue(stock?.quantity) ?? 0);
    const deltaNum = delta === "" || delta === "-" ? 0 : Number(delta);
    const preview = currentQty + deltaNum;
    const previewColors = getQtyColor(preview);

    async function handleSubmit() {
        if (delta === "" || isNaN(Number(delta))) return;
        setLoading(true);
        setError(null);
        try {
            const stockId = getScalarValue(stock?.id);
            const newQty = currentQty + Number(delta);
            await patchResource("stock_availables", stockId, {
                stock_available: {
                    id: stockId,
                    id_product: getScalarValue(stock?.id_product),
                    id_product_attribute: getScalarValue(stock?.id_product_attribute) || "0",
                    quantity: String(newQty),
                    depends_on_stock: getScalarValue(stock?.depends_on_stock) || "0",
                    out_of_stock: getScalarValue(stock?.out_of_stock) || "0",
                },
            });
            onPatch(stockId, newQty);
            onClose();
        } catch (err) {
            setError(err?.message ?? "Patch failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative z-10 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-semibold text-lg tracking-tight">Ajuster le stock</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">×</button>
                </div>

                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Produit #{getScalarValue(stock?.id_product)}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-white/70 text-sm">Stock actuel :</span>
                        <QuantityBadge qty={currentQty} />
                    </div>
                </div>

                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">Quantité à ajouter</label>
                <input
                    type="number"
                    value={delta}
                    onChange={e => setDelta(e.target.value)}
                    placeholder="ex: 10 ou -5"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-indigo-400/60 focus:bg-white/8 transition-all placeholder:text-white/20"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />

                {delta !== "" && !isNaN(Number(delta)) && delta !== "-" && (
                    <div className="mt-3 p-3 rounded-xl bg-white/3 border border-white/8 flex items-center gap-2">
                        <span className="text-white/50 text-sm">Nouveau stock :</span>
                        <QuantityBadge qty={preview} />
                        <span className={`text-xs font-mono ml-auto ${previewColors.text}`}>
                            {currentQty} {Number(delta) >= 0 ? "+" : ""}{delta} = {preview}
                        </span>
                    </div>
                )}

                {error && (
                    <div className="mt-3 p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || delta === "" || isNaN(Number(delta)) || delta === "-"}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
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

function StockRow({ stock, onEdit }) {
    const qty = Number(getScalarValue(stock?.quantity) ?? 0);
    const colors = getQtyColor(qty);
    const productId = getScalarValue(stock?.id_product);
    const attrId = getScalarValue(stock?.id_product_attribute);
    const location = getScalarValue(stock?.location);

    return (
        <tr className={`border-b border-white/5 transition-colors hover:bg-white/[0.03] group ${colors.bg}`}>
            <td className="px-4 py-3 font-mono text-white/50 text-sm">{getScalarValue(stock?.id)}</td>
            <td className="px-4 py-3">
                <span className="font-mono text-white text-sm font-medium">#{productId}</span>
            </td>
            <td className="px-4 py-3">
                {attrId && attrId !== "0" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">#{attrId}</span>
                ) : (
                    <span className="text-white/20 text-xs">—</span>
                )}
            </td>
            <td className="px-4 py-3">
                <QuantityBadge qty={qty} />
            </td>
            <td className="px-4 py-3 text-white/40 text-sm font-mono">
                {location || <span className="text-white/15">—</span>}
            </td>
            <td className="px-4 py-3 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    getScalarValue(stock?.depends_on_stock) === "1"
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-white/5 text-white/30"
                }`}>
                    {getScalarValue(stock?.depends_on_stock) === "1" ? "oui" : "non"}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={() => onEdit(stock)}
                    className="opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-xs font-medium border border-indigo-500/30 hover:border-indigo-400/50"
                >
                    Modifier
                </button>
            </td>
        </tr>
    );
}

function StockAvailable() {
    const [stockAvailable, setStockAvailable] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [editingStock, setEditingStock] = useState(null);
    const [search, setSearch] = useState("");

    const load = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);

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

            const stockResponse = await getList("stock_availables", {
                display: "full",
                sort: "[id_ASC]",
                filters: { id_product: `[${idStr}]` },
                signal,
            });

            const stockResult = normalizeStockAvailables(stockResponse?.data ?? stockResponse);
            setStockAvailable(stockResult);
            setStatus("success");
        } catch (err) {
            if (isAbortError(err)) return;
            setError(err?.message ?? "Erreur inconnue");
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    function handlePatch(stockId, newQty) {
        setStockAvailable(prev =>
            prev.map(s =>
                getScalarValue(s?.id) === stockId
                    ? { ...s, quantity: String(newQty) }
                    : s
            )
        );
    }

    const filtered = stockAvailable.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            getScalarValue(s?.id).includes(q) ||
            getScalarValue(s?.id_product).includes(q) ||
            getScalarValue(s?.location).toLowerCase().includes(q)
        );
    });

    const total = stockAvailable.length;
    const negative = stockAvailable.filter(s => Number(getScalarValue(s?.quantity)) < 0).length;
    const zero = stockAvailable.filter(s => Number(getScalarValue(s?.quantity)) === 0).length;
    const positive = stockAvailable.filter(s => Number(getScalarValue(s?.quantity)) > 0).length;

    return (
        <div className="min-h-screen bg-[#080a0f] text-white font-sans">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');
                body { font-family: 'Syne', sans-serif; }
                .mono { font-family: 'IBM Plex Mono', monospace; }
                .scan-line {
                    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px);
                    pointer-events: none;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in { animation: fadeInUp 0.4s ease forwards; }
                .fade-in-delay { animation: fadeInUp 0.4s ease 0.1s both; }
            `}</style>

            <div className="fixed inset-0 scan-line z-0 pointer-events-none" />
            <div className="fixed top-0 left-1/3 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="mb-10 fade-in">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="mono text-indigo-400/70 text-xs uppercase tracking-[0.25em]">PrestaShop 8.2.6 · Webservice</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Gestion des stocks
                    </h1>
                    <p className="text-white/30 text-sm mt-1">stock_availables · Mise à jour en temps réel</p>
                </div>

                {/* Stats */}
                {status === "success" && (
                    <div className="grid grid-cols-4 gap-3 mb-8 fade-in-delay">
                        {[
                            { label: "Total", value: total, color: "text-white" },
                            { label: "En stock", value: positive, color: "text-emerald-400" },
                            { label: "Épuisé", value: zero, color: "text-yellow-400" },
                            { label: "Négatif", value: negative, color: "text-red-400" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4">
                                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
                                <p className={`text-2xl font-bold mono ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search + Refresh */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="relative flex-1">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher par ID, produit, emplacement…"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-400/40 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => {
                            const c = new AbortController();
                            load(c.signal);
                        }}
                        disabled={status === "loading"}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                        <svg className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
                    {status === "loading" && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <svg className="animate-spin w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            <p className="text-white/30 text-sm mono">Chargement des stocks…</p>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-900/30 border border-red-500/30 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                </svg>
                            </div>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {status === "success" && (
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-white/8 bg-white/3">
                                {["ID Stock", "Produit", "Variante", "Quantité", "Emplacement", "Dépend stock", ""].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-white/30 text-xs uppercase tracking-widest font-medium">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-white/20 text-sm">
                                        Aucun résultat
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(stock => (
                                    <StockRow
                                        key={getScalarValue(stock?.id)}
                                        stock={stock}
                                        onEdit={setEditingStock}
                                    />
                                ))
                            )}
                            </tbody>
                        </table>
                    )}
                </div>

                {status === "success" && filtered.length > 0 && (
                    <p className="text-white/20 text-xs mono mt-3 text-right">
                        {filtered.length} / {total} entrées · Survolez une ligne pour modifier
                    </p>
                )}
            </div>

            {editingStock && (
                <PatchModal
                    stock={editingStock}
                    onClose={() => setEditingStock(null)}
                    onPatch={handlePatch}
                />
            )}
        </div>
    );
}

export default StockAvailable;