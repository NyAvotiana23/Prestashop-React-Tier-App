import React, {useCallback, useEffect, useMemo, useState} from "react";
import {fetchManageStockData} from "../../service/manage-stock-service.js";
import {isAbortError, normalizeText} from "../../utils/util-functions.js";

function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("fr-FR");
}

function QuantityBadge({value}) {
    const num = Number(value);
    const className = num < 0
        ? "bg-red-100 text-red-700 border border-red-200"
        : num === 0
            ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
            : "bg-green-100 text-green-700 border border-green-200";

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
            {formatNumber(value)}
        </span>
    );
}

function ManageStock() {
    const [rows, setRows] = useState([]);
    const [categoryRows, setCategoryRows] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    const load = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);
            const data = await fetchManageStockData({signal});
            setRows(data.rows);
            setCategoryRows(data.categoryRows);
            setStatus("success");
        } catch (err) {
            if (isAbortError(err, signal)) return;
            setError(err?.message ?? "Erreur inconnue");
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const filteredRows = useMemo(() => {
        if (!search.trim()) return rows;
        const q = normalizeText(search);
        return rows.filter((row) => {
            const values = [
                row.stockId,
                row.articleLabel,
                row.reference,
                row.categoryName,
            ];
            return values.some((value) => normalizeText(String(value ?? "")).includes(q));
        });
    }, [rows, search]);

    const productTotals = useMemo(() => {
        return filteredRows.reduce(
            (acc, row) => {
                acc.physical += row.physical;
                acc.reserved += row.reserved;
                acc.available += row.available;
                return acc;
            },
            {physical: 0, reserved: 0, available: 0}
        );
    }, [filteredRows]);

    const categoryTotals = useMemo(() => {
        return categoryRows.reduce(
            (acc, row) => {
                acc.physical += row.physical;
                acc.reserved += row.reserved;
                acc.available += row.available;
                return acc;
            },
            {physical: 0, reserved: 0, available: 0}
        );
    }, [categoryRows]);

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

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-800">Gestion du stock</h1>
                    <p className="text-sm text-gray-500">Resume des quantites physiques, reservees et disponibles.</p>
                </div>
                <button
                    onClick={() => {
                        const controller = new AbortController();
                        load(controller.signal);
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

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h2 className="text-lg font-semibold text-gray-700 flex-1">Stock par produit</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Total physique: <span className="font-semibold text-gray-700">{formatNumber(productTotals.physical)}</span></span>
                        <span>Reserve: <span className="font-semibold text-gray-700">{formatNumber(productTotals.reserved)}</span></span>
                        <span>Disponible: <span className="font-semibold text-gray-700">{formatNumber(productTotals.available)}</span></span>
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Produit, reference, categorie…"
                            className="border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200">
                            {["ID", "Article", "Reference", "Categorie", "Physique", "Reserve", "Disponible"].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                                    Aucun resultat
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row) => (
                                <tr key={`${row.stockId}-${row.attrId}`} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{row.stockId}</td>
                                    <td className="px-4 py-3 text-gray-800 text-sm font-medium">{row.articleLabel}</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm font-mono">{row.reference}</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">{row.categoryName}</td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.physical}/></td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.reserved}/></td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.available}/></td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {filteredRows.length > 0 && (
                    <p className="text-gray-400 text-xs mt-4 text-right">
                        {filteredRows.length} / {rows.length} lignes
                    </p>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-700">Stock par categorie</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>Total physique: <span className="font-semibold text-gray-700">{formatNumber(categoryTotals.physical)}</span></span>
                        <span>Reserve: <span className="font-semibold text-gray-700">{formatNumber(categoryTotals.reserved)}</span></span>
                        <span>Disponible: <span className="font-semibold text-gray-700">{formatNumber(categoryTotals.available)}</span></span>
                        <span className="text-gray-400">{categoryRows.length} categorie(s)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200">
                            {["Categorie", "Articles", "Physique", "Reserve", "Disponible"].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {categoryRows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                                    Aucun resultat
                                </td>
                            </tr>
                        ) : (
                            categoryRows.map((row) => (
                                <tr key={row.categoryId || row.categoryName} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-700 text-sm font-medium">{row.categoryName}</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">{formatNumber(row.count)}</td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.physical}/></td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.reserved}/></td>
                                    <td className="px-4 py-3"><QuantityBadge value={row.available}/></td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ManageStock;