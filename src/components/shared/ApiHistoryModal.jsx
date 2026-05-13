import { useState, useEffect, useRef } from "react";
import StatusBannerCard from "./StatusBannerCard.jsx";

const LIMIT_OPTIONS = [10, 25, 50, 100];
const METHOD_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function buildHistoryText(entries) {
    if (!entries.length) return "";
    const lines = ["API history export"];
    entries.forEach((entry, index) => {
        const timeLabel = entry?.timestamp ? new Date(entry.timestamp).toISOString() : "";
        const method = entry?.method ? String(entry.method).toUpperCase() : "";
        const status = entry?.status ? `${entry.status}` : "";
        const statusText = entry?.statusText ?? "";
        const url = entry?.fullUrl ?? entry?.endpoint ?? "";
        const header = `${index + 1}. ${timeLabel} ${method} ${url}`.trim();
        lines.push(header);
        if (status || statusText) lines.push(`Status: ${[status, statusText].filter(Boolean).join(" ")}`);
        if (entry?.title) lines.push(`Title: ${entry.title}`);
        if (entry?.message) lines.push(`Message: ${entry.message}`);
        if (Array.isArray(entry?.details) && entry.details.length) {
            lines.push("Details:");
            entry.details.forEach((item) => lines.push(`- ${item}`));
        }
        lines.push("");
    });
    return lines.join("\n");
}

export default function ApiHistoryModal({ isOpen, onClose, history = [], historyLimit, onClear }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [limit, setLimit] = useState(50);
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filtered = history
        .filter((entry) => {
            if (statusFilter === "success" && !entry?.ok) return false;
            if (statusFilter === "error" && entry?.ok) return false;
            return true;
        })
        .filter((entry) => {
            if (methodFilter === "all") return true;
            return String(entry?.method ?? "").toUpperCase() === methodFilter;
        })
        .slice(0, limit);

    const usedMethods = [...new Set(history.map((e) => String(e?.method ?? "").toUpperCase()).filter(Boolean))];

    function handleExport() {
        const content = buildHistoryText(filtered);
        if (!content) return;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
        const link = document.createElement("a");
        link.href = url;
        link.download = `api-history-${stamp}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function handleOverlayClick(e) {
        if (e.target === overlayRef.current) onClose();
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
        >
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90dvh] sm:max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                            Historique API
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {filtered.length}{history.length !== filtered.length ? ` / ${history.length}` : ""}
                            {historyLimit ? ` (max ${historyLimit})` : ""}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Fermer"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 shrink-0">
                    {/* Status filter */}
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
                        {[
                            { value: "all", label: "Tous" },
                            { value: "success", label: "✓ Succès" },
                            { value: "error", label: "✕ Erreurs" },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${
                                    statusFilter === value
                                        ? "bg-white text-gray-800 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Method filter */}
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
                        <button
                            onClick={() => setMethodFilter("all")}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                methodFilter === "all"
                                    ? "bg-white text-gray-800 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Toutes méthodes
                        </button>
                        {METHOD_OPTIONS.filter((m) => usedMethods.includes(m)).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMethodFilter(m)}
                                className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                                    methodFilter === m
                                        ? "bg-white text-gray-800 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* Limit */}
                    <div className="flex items-center gap-1.5 ml-auto text-xs text-gray-500">
                        <span>Limite</span>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        >
                            {LIMIT_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
                            <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                            </svg>
                            Aucune entrée correspondante
                        </div>
                    ) : (
                        filtered.map((entry, index) => (
                            <StatusBannerCard
                                key={`${entry?.timestamp ?? "item"}-${index}`}
                                variant={entry?.ok ? "success" : "error"}
                                title={entry?.title}
                                message={entry?.message}
                                details={entry?.details}
                                requestInfo={{
                                    method: entry?.method,
                                    url: entry?.fullUrl,
                                }}
                                timestamp={entry?.timestamp}
                                defaultOpen={false}
                                showTimestamp
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={() => { onClear?.(); onClose(); }}
                        className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
                        </svg>
                        Effacer l'historique
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" />
                        </svg>
                        Exporter .txt
                    </button>
                </div>
            </div>
        </div>
    );
}