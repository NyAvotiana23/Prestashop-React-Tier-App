import { XMLParser } from "fast-xml-parser";

const listeners = new Set();
const historyListeners = new Set();
let lastResponse = null;

const DEFAULT_API_RESPONSE_HISTORY_LIMIT = 50;
let apiResponseHistoryLimit = DEFAULT_API_RESPONSE_HISTORY_LIMIT;
const apiResponseHistory = [];

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
});

function notify() {
    for (const listener of listeners) {
        listener(lastResponse);
    }
}

function notifyHistory() {
    const snapshot = getApiResponseHistory();
    for (const listener of historyListeners) {
        listener(snapshot);
    }
}

export function subscribeToApiResponses(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function subscribeToApiResponseHistory(listener) {
    historyListeners.add(listener);
    return () => historyListeners.delete(listener);
}

export function getApiResponseHistory() {
    return [...apiResponseHistory];
}

export function getApiResponseHistoryLimit() {
    return apiResponseHistoryLimit;
}

export function setApiResponseHistoryLimit(nextLimit) {
    const parsed = Number(nextLimit);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    apiResponseHistoryLimit = Math.floor(parsed);
    if (apiResponseHistory.length > apiResponseHistoryLimit) {
        apiResponseHistory.length = 0;
        notifyHistory();
    }
}

export function getLastApiResponse() {
    return lastResponse;
}

export function dismissApiResponse() {
    lastResponse = null;
    notify();
}

export function emitApiResponse(payload) {
    lastResponse = {
        ...payload,
        timestamp: Date.now(),
    };

    if (apiResponseHistory.length + 1 > apiResponseHistoryLimit) {
        apiResponseHistory.length = 0;
    }
    apiResponseHistory.push(lastResponse);

    notify();
    notifyHistory();
    return lastResponse;
}

function extractResourceContext(endpoint) {
    if (!endpoint || typeof endpoint !== "string") {
        return { resource: null, id: null };
    }

    const cleanEndpoint = endpoint.split("?")[0].replace(/^\/+|\/+$/g, "");
    if (!cleanEndpoint) {
        return { resource: null, id: null };
    }

    const [resource, id] = cleanEndpoint.split("/");
    return { resource: resource || null, id: id || null };
}

function parsePrestashopErrors(rawXml) {
    if (!rawXml || typeof rawXml !== "string") return [];

    let parsed;
    try {
        parsed = xmlParser.parse(rawXml);
    } catch {
        return [];
    }

    const errorsRoot = parsed?.prestashop?.errors ?? parsed?.errors;
    const errorNode = errorsRoot?.error;

    if (!errorNode) return [];

    const errorList = Array.isArray(errorNode) ? errorNode : [errorNode];
    return errorList
        .map((item) => ({
            code: item?.code ?? item?.["@_code"],
            message: (item?.message ?? item?.["@_message"])?.trim?.(),
        }))
        .filter((item) => item.code || item.message);
}

function extractPrestashopHints(message) {
    if (!message || typeof message !== "string") {
        return { suggestion: null, available: [] };
    }

    const suggestionMatch = message.match(/Did you mean:\s*"([^"]+)"/i);
    const suggestion = suggestionMatch ? suggestionMatch[1] : null;

    const available = [];
    const listMarker = "The full list is:";
    const listIndex = message.indexOf(listMarker);
    if (listIndex >= 0) {
        const listText = message.slice(listIndex + listMarker.length);
        for (const match of listText.matchAll(/"([^"]+)"/g)) {
            if (match[1]) available.push(match[1]);
        }
    }

    return { suggestion, available };
}

function buildErrorCodeExplanation(code) {
    const normalizedCode = code ? String(code) : null;
    if (!normalizedCode) return null;

    const explanations = {
        "26": "Ressource non autorisee pour cette cle API.",
        "27": "Ressource inexistante (nom incorrect).",
    };

    return explanations[normalizedCode] ?? null;
}

function buildPotentialCauses(status) {
    if (!status) return [];

    switch (status) {
        case 400:
            return [
                "Parametres invalides (filtre, tri, limit, display).",
                "XML ou payload non conforme au schema PrestaShop.",
                "Champ requis manquant ou valeur invalide.",
            ];
        case 401:
            return [
                "Cle API absente, vide ou invalide.",
                "Cle desactivee dans le back-office.",
            ];
        case 403:
            return [
                "Permissions insuffisantes pour cette ressource.",
                "Acces restreint a une boutique ou un groupe de boutiques.",
            ];
        case 404:
            return [
                "Ressource ou identifiant introuvable.",
                "Endpoint incorrect ou route proxy non configuree.",
                "Cle API sans acces a cette ressource.",
            ];
        case 405:
            return [
                "Methode HTTP non autorisee pour cette ressource.",
                "Permissions de la cle API incompletes.",
            ];
        case 500:
            return [
                "Erreur serveur PrestaShop ou module.",
                "XML invalide ou champ non supporte.",
            ];
        case 503:
            return [
                "Webservice PrestaShop desactive.",
                "Maintenance ou surcharge serveur.",
            ];
        default:
            return [];
    }
}

export function buildApiSuccessPayload({ method, endpoint, status, statusText, fullUrl }) {
    const { resource, id } = extractResourceContext(endpoint);
    const details = [];

    if (resource) details.push(`Ressource: ${resource}.`);
    if (id) details.push(`ID: ${id}.`);

    return {
        ok: true,
        status: status ?? null,
        statusText: statusText ?? null,
        method,
        endpoint,
        fullUrl: fullUrl ?? null,
        title: "API: succes",
        message: `Requete ${method} reussie.`,
        details,
        resource,
        id,
    };
}

export function buildApiErrorPayload({ error, method, endpoint, fullUrl }) {
    const status = error?.response?.status ?? null;
    const statusText = error?.response?.statusText ?? null;
    const rawXml = typeof error?.response?.data === "string" ? error.response.data : null;
    const parsedErrors = parsePrestashopErrors(rawXml);
    const { resource, id } = extractResourceContext(endpoint);

    const details = [];
    if (resource) details.push(`Ressource: ${resource}.`);
    if (id) details.push(`ID: ${id}.`);

    const potentialCauses = buildPotentialCauses(status);
    details.push(...potentialCauses);

    if (parsedErrors.length) {
        parsedErrors.forEach((item) => {
            const codeLabel = item.code ? `Code ${item.code}` : "Code inconnu";
            const messageLabel = item.message ? `: ${item.message}` : "";
            details.push(`${codeLabel}${messageLabel}`);

            const explanation = buildErrorCodeExplanation(item.code);
            if (explanation) details.push(explanation);

            if (item.message) {
                const hints = extractPrestashopHints(item.message);
                if (hints.suggestion) {
                    details.push(`Suggestion: ${hints.suggestion}.`);
                }
                if (hints.available.length) {
                    details.push(`Ressources disponibles: ${hints.available.join(", ")}.`);
                }
            }
        });
    }

    if (!parsedErrors.length && rawXml) {
        details.push("Reponse XML d'erreur recue, mais sans message exploitable.");
    }

    if (error?.message?.toLowerCase().includes("xml parse")) {
        details.push("Echec du parse XML: verifier la reponse brute ou un HTML renvoye.");
    }

    const titleStatus = status ? ` ${status}` : "";

    return {
        ok: false,
        status,
        statusText,
        method,
        endpoint,
        fullUrl: fullUrl ?? null,
        title: `API: erreur${titleStatus}`,
        message: error?.message ?? "Erreur API inconnue.",
        details,
        resource,
        id,
        rawXml,
        errors: parsedErrors,
    };
}
