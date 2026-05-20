// Centralise l'appel vers l'endpoint /custom_order_state.
import { sendJson } from "../api/prestashopApi";

const CUSTOM_ORDER_STATE_ENDPOINT = "custom_order_state";
const ALLOWED_CUSTOM_ORDER_STATES = new Set([5, 6]);
export const LIVRE_STATE_ID = 5;
export const ANNULE_STATE_ID = 6;

function toPositiveInt(value, fieldName) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${fieldName} doit etre un entier positif.`);
    }
    return parsed;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function formatDateTime(date) {
    return [
        date.getFullYear(),
        pad2(date.getMonth() + 1),
        pad2(date.getDate()),
    ].join("-") +
        " " +
        [pad2(date.getHours()), pad2(date.getMinutes()), pad2(date.getSeconds())].join(":");
}

function normalizeEffectiveDate(value) {
    if (value === undefined || value === null) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new Error("effectiveDate est une date invalide.");
        }
        return formatDateTime(value);
    }

    const trimmed = String(value).trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return `${trimmed} 00:00:00`;
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})( \d{2}:\d{2}:\d{2})?$/);
    if (frMatch) {
        const timePart = frMatch[4] ? frMatch[4] : " 00:00:00";
        return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}${timePart}`;
    }

    throw new Error(
        "effectiveDate invalide. Formats acceptes: YYYY-MM-DD HH:MM:SS, YYYY-MM-DD ou DD/MM/YYYY."
    );
}

export async function updateOrderState({
    orderId,
    stateId,
    employeeId,
    effectiveDate,
    signal,
} = {}) {
    const normalizedOrderId = toPositiveInt(orderId, "orderId");
    const normalizedStateId = toPositiveInt(stateId, "stateId");

    if (!ALLOWED_CUSTOM_ORDER_STATES.has(normalizedStateId)) {
        throw new Error("stateId autorise: 5 (livre) ou 6 (annule).");
    }

    const normalizedEmployeeId = employeeId ? toPositiveInt(employeeId, "employeeId") : null;
    const normalizedDate = normalizeEffectiveDate(effectiveDate);

    const payload = {
        manual_order_state: {
            id_order: String(normalizedOrderId),
            id_order_state: String(normalizedStateId),
        },
    };

    if (normalizedEmployeeId) {
        payload.manual_order_state.id_employee = String(normalizedEmployeeId);
    }

    if (normalizedDate) {
        payload.manual_order_state.date = normalizedDate;
    }

    const response = await sendJson("POST", CUSTOM_ORDER_STATE_ENDPOINT, payload, { signal });
    const result = response?.data?.manual_order_state ?? response?.data ?? null;

    return { ...response, data: result };
}

export { CUSTOM_ORDER_STATE_ENDPOINT };

