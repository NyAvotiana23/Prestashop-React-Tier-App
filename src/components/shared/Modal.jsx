export default function Modal({isOpen, title, onClose, children}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded bg-white shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                    >
                        Close
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}

