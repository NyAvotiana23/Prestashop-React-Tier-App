import {useState, useCallback} from "react";

function useCopyToClipboard(resetDelay = 2000) {
    const [status, setStatus] = useState("idle");
    // status: "idle" | "copied" | "error"

    const copy = useCallback(async (text) => {
        if (!navigator?.clipboard) {
            console.warn("Clipboard API not available");
            setStatus("error");
            return false;
        }
        try {
            await navigator.clipboard.writeText(text);
            setStatus("copied");
            setTimeout(() => setStatus("idle"), resetDelay);
            return true;
        } catch (err) {
            console.error("Copy failed:", err);
            setStatus("error");
            setTimeout(() => setStatus("idle"), resetDelay);
            return false;
        }
    }, [resetDelay]);

    return {copy, status, isCopied: status === "copied"};
}

export default useCopyToClipboard;