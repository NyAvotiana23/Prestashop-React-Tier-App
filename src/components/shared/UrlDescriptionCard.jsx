import {useEffect, useState} from "react";
import {getJson} from "../../api/prestashopApi.js";
import {isAbortError} from "../../utils/util-functions.js";

export default function UrlDescriptionCard({node, url}) {
    const rawUrl = url || node?.["xlink:href"] || "";
    const targetUrl = normalizeApiUrl(rawUrl);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!targetUrl) return;

        const controller = new AbortController();

        async function loadData() {
            try {
                setStatus("loading");
                setError(null);

                const response = await getJson(targetUrl, {
                    signal: controller.signal,
                });

                setData(response?.data ?? null);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadData();
        return () => controller.abort();
    }, [targetUrl]);

    if (!targetUrl) {
        return <p className="text-sm text-gray-600">No linked resource URL.</p>;
    }

    if (status === "loading") {
        return <p className="text-sm text-gray-600">Loading {targetUrl}...</p>;
    }

    if (status === "error") {
        return (
            <p className="text-sm text-red-600">Failed to load: {error?.message}</p>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <p className="text-xs font-semibold uppercase text-gray-500">URL</p>
                <p className="break-all text-sm text-gray-700">{targetUrl}</p>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Data</p>
                <pre className="max-h-[420px] overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}

function normalizeApiUrl(value) {
    if (!value) return "";
    if (!value.includes("/api/")) return value;
    const index = value.indexOf("/api/");
    return value.slice(index + 5);
}
