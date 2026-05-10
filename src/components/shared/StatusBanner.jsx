import {useState} from "react";

import CopyButton from "../../utils/CopyButton.jsx";

const VARIANTS = {
    success: {
        bar: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        icon: "✓",
        label: "Success",
        detail: "bg-emerald-50 border-emerald-100 text-emerald-800",
        methodPill: "bg-emerald-100 text-emerald-700",
    },
    error: {
        bar: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
        icon: "✕",
        label: "Error",
        detail: "bg-rose-50 border-rose-100 text-rose-800",
        methodPill: "bg-rose-100 text-rose-700",
    },
    info: {
        bar: "bg-sky-500",
        badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
        icon: "i",
        label: "Info",
        detail: "bg-sky-50 border-sky-100 text-sky-800",
        methodPill: "bg-sky-100 text-sky-700",
    },
};

export default function StatusBanner({
                                         variant = "info",
                                         title,
                                         message,
                                         details = [],
                                         requestInfo,
                                     }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!message && !title && (!details || details.length === 0) && !requestInfo)
        return null;

    const v = VARIANTS[variant] ?? VARIANTS.info;
    const hasDetails = Array.isArray(details) && details.length > 0;
    const hasRequestInfo = Boolean(requestInfo?.method || requestInfo?.url);
    const method = requestInfo?.method
        ? String(requestInfo.method).toUpperCase()
        : null;
    const url = requestInfo?.url ?? null;
    const canExpand = Boolean(
        title || message || hasDetails || hasRequestInfo
    );

    return (
        <div className="w-full max-w-md font-[system-ui]">
            {/* Card */}
            <div
                className="relative rounded-2xl bg-white border border-gray-100 shadow-sm shadow-gray-100/80 overflow-hidden">
                {/* Colored left accent bar */}
                <div className={`absolute inset-y-0 left-0 w-1 ${v.bar} rounded-l-2xl`}/>

                {/* Header row */}
                <div className="flex items-center justify-between pl-5 pr-4 py-4">
                    <div className="flex items-center gap-3">
                        {/* Status badge */}
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${v.badge}`}
                        >
              <span className="text-[10px] font-bold">{v.icon}</span>
                            {v.label}
            </span>

                        {/* Title or fallback label */}
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
              {title ?? "API Response"}
            </span>
                    </div>

                    {/* Expand toggle */}
                    {canExpand && (
                        <button
                            onClick={() => setIsOpen((o) => !o)}
                            aria-expanded={isOpen}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-150 px-2 py-1 rounded-lg hover:bg-gray-50 active:scale-95"
                        >
                            {isOpen ? "Less" : "Details"}
                            <svg
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 4l4 4 4-4"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Expandable body */}
                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                    <div
                        className={`mx-4 mb-4 rounded-xl border p-4 space-y-3 ${v.detail}`}
                    >
                        {/* Request info pill row */}
                        {hasRequestInfo && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {method && (
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider ${v.methodPill}`}
                                    >
                    {method}
                  </span>
                                )}
                                {url && (
                                    <>
                                        <CopyButton text={url}/>
                                        <span className="text-[12px] font-mono text-gray-500 truncate">{url}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Message */}
                        {message && (
                            <p className="text-sm leading-relaxed">{message}</p>
                        )}

                        {/* Detail bullets */}
                        {hasDetails && (
                            <ul className="space-y-1">
                                {details.map((item, i) => (
                                    <li
                                        key={`${item}-${i}`}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-60"/>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}