import { useState } from "react";
import StatusBannerCard from "./StatusBannerCard.jsx";
import ApiHistoryModal from "./ApiHistoryModal.jsx";

export default function StatusBanner({
                                         variant = "info",
                                         title,
                                         message,
                                         details = [],
                                         requestInfo,
                                         history = [],
                                         historyLimit,
                                         timestamp,
                                         onClearHistory,
                                     }) {
    const [modalOpen, setModalOpen] = useState(false);

    const currentTimestamp = timestamp ?? null;
    const historyItems = Array.isArray(history)
        ? history.filter((item) => item?.timestamp !== currentTimestamp)
        : [];

    const errorCount = historyItems.filter((e) => !e?.ok).length;

    return (
        <>
            <div className="w-full space-y-3">
                <StatusBannerCard
                    variant={variant}
                    title={title}
                    message={message}
                    details={details}
                    requestInfo={requestInfo}
                    timestamp={timestamp}
                    defaultOpen={false}
                    showTimestamp={false}
                />

                {historyItems.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:border-gray-200 transition-colors w-full"
                    >
                        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h12M2 8h8M2 12h5" />
                        </svg>
                        <span className="font-medium">
                            Historique API
                        </span>
                        <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            {historyItems.length}{historyLimit ? ` / ${historyLimit}` : ""}
                        </span>
                        {errorCount > 0 && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
                                {errorCount} erreur{errorCount > 1 ? "s" : ""}
                            </span>
                        )}
                        <svg className="w-3.5 h-3.5 text-gray-400 ml-auto" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5l4 4 4-4" />
                        </svg>
                    </button>
                )}
            </div>

            <ApiHistoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                history={historyItems}
                historyLimit={historyLimit}
                onClear={onClearHistory}
            />
        </>
    );
}