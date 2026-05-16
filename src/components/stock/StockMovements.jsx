import React, {useCallback, useEffect, useMemo, useState} from "react";
import {getList} from "../../api/prestashopCrud.js";
import {ensureArray, getScalarValue, isAbortError} from "../../utils/util-functions.js";

function normalizeStockMovements(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.stock_movements?.stock_movement ??
        data?.stock_mvts?.stock_mvt ??
        data?.stock_movement ??
        data?.stock_mvt ??
        data?.stock_movements ??
        data?.stock_mvts ??
        [];
    return ensureArray(node);
}

function parseDateTime(value) {
    if (!value) return null;
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function getDateKey(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
}

function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("fr-FR");
}

function StockMovements() {
    const [movements, setMovements] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [reference, setReference] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const load = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);

            const response = await getList("stock_movements", {
                display: "full",
                sort: "[id_ASC]",
                signal,
            });

            const result = normalizeStockMovements(response?.data ?? response);
            setMovements(result);
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

    const filteredMovements = useMemo(() => {
        const ref = reference.trim().toLowerCase();
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (to) {
            to.setHours(23, 59, 59, 999);
        }

        return movements.filter((movement) => {
            const refValue = getScalarValue(movement?.reference).toLowerCase();
            if (ref && !refValue.includes(ref)) return false;

            if (!from && !to) return true;
            const movementDate = parseDateTime(getScalarValue(movement?.date_add));
            if (!movementDate) return false;
            if (from && movementDate < from) return false;
            if (to && movementDate > to) return false;
            return true;
        });
    }, [movements, reference, dateFrom, dateTo]);

    const dailyRows = useMemo(() => {
        const map = new Map();

        filteredMovements.forEach((movement) => {
            const dateKey = getDateKey(getScalarValue(movement?.date_add)) || "Inconnu";
            const sign = Number(getScalarValue(movement?.sign) || 0);
            const qty = Number(getScalarValue(movement?.physical_quantity) || 0);
            const delta = sign * qty;

            const prev = map.get(dateKey) ?? {date: dateKey, inQty: 0, outQty: 0, net: 0, count: 0};
            if (delta >= 0) {
                prev.inQty += delta;
            } else {
                prev.outQty += Math.abs(delta);
            }
            prev.net += delta;
            prev.count += 1;

            map.set(dateKey, prev);
        });

        return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    }, [filteredMovements]);

    const totals = useMemo(() => {
        return dailyRows.reduce(
            (acc, row) => {
                acc.inQty += row.inQty;
                acc.outQty += row.outQty;
                acc.net += row.net;
                acc.count += row.count;
                return acc;
            },
            {inQty: 0, outQty: 0, net: 0, count: 0}
        );
    }, [dailyRows]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-gray-500 text-sm">Chargement des mouvements…</p>
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
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Mouvements de stock</h1>

            <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs uppercase text-gray-400 font-semibold mb-1">Reference produit</label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="ex: REF-001"
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs uppercase text-gray-400 font-semibold mb-1">Date debut</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs uppercase text-gray-400 font-semibold mb-1">Date fin</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setReference("");
                            setDateFrom("");
                            setDateTo("");
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Tout
                    </button>
                    <button
                        onClick={() => {
                            const controller = new AbortController();
                            load(controller.signal);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Actualiser
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Mouvements</p>
                    <p className="text-2xl font-bold text-gray-800">{formatNumber(totals.count)}</p>
                </div>
                <div className="bg-green-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Entrees</p>
                    <p className="text-2xl font-bold text-green-700">{formatNumber(totals.inQty)}</p>
                </div>
                <div className="bg-red-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Sorties</p>
                    <p className="text-2xl font-bold text-red-700">{formatNumber(totals.outQty)}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Net</p>
                    <p className="text-2xl font-bold text-blue-700">{formatNumber(totals.net)}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 flex-1">Evolution journaliere</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200">
                            {["Date", "Entrees", "Sorties", "Net", "Mouvements"].map((h) => (
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
                        {dailyRows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                                    Aucun resultat
                                </td>
                            </tr>
                        ) : (
                            dailyRows.map((row) => (
                                <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-700 font-medium">{row.date}</td>
                                    <td className="px-4 py-3 text-green-700">{formatNumber(row.inQty)}</td>
                                    <td className="px-4 py-3 text-red-700">{formatNumber(row.outQty)}</td>
                                    <td className={`px-4 py-3 font-semibold ${row.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                                        {row.net >= 0 ? "+" : ""}{formatNumber(row.net)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{formatNumber(row.count)}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                <p className="text-gray-400 text-xs mt-4 text-right">
                    {dailyRows.length} jour(s) affiches
                </p>
            </div>
        </div>
    );
}

export default StockMovements;

