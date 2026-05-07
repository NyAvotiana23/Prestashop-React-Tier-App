export default function StatusBanner({variant = "info", title, message}) {
    if (!message && !title) return null;

    const styles = {
        success: "border-green-300 bg-green-50 text-green-700",
        error: "border-red-300 bg-red-50 text-red-700",
        info: "border-blue-300 bg-blue-50 text-blue-700",
    };

    const className = styles[variant] ?? styles.info;

    return (
        <div className={`rounded border p-4 ${className}`}>
            {title && <p className="font-semibold">{title}</p>}
            {message && <p className="text-sm">{message}</p>}
        </div>
    );
}

