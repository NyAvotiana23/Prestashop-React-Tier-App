import {getJson, prestashopRequest, sendJson, buildFullUrl} from "./prestashopApi";
import {
    buildApiErrorPayload,
    buildApiSuccessPayload,
    emitApiResponse,
} from "./api-response-handler";

function normalizeRef(ref) {
    if (!ref || typeof ref !== "string") {
        throw new Error("ref must be a non-empty string");
    }

    return ref.replace(/^\/+|\/+$/g, "");
}

function buildListParams(options = {}) {
    const {display, sort, limit, date, filters, params} = options;

    const nextParams = {...params};

    if (display) nextParams.display = display;
    if (sort) nextParams.sort = sort;
    if (limit !== undefined) nextParams.limit = limit;
    if (date !== undefined) nextParams.date = date;

    if (filters && typeof filters === "object") {
        Object.entries(filters).forEach(([key, value]) => {
            nextParams[`filter[${key}]`] = value;
        });
    }

    return nextParams;
}

/**
 * Extracts resource IDs from a parsed list response.
 *
 * With display=[id], PrestaShop returns shallow resource nodes like:
 *   { products: { product: [ { "@_id": "4" }, { "@_id": "7" } ] } }
 *
 * Because the XMLParser is configured with isArray (see prestashopApi.js),
 * the child list is always an array even when there is only one item.
 *
 * We only read "@_id" from the direct children — no recursion — so we
 * never accidentally pick up IDs from nested associations or other fields.
 */
function parseIdsFromListData(data, ref) {
    if (!data || typeof data !== "object") return [];

    const root = data?.prestashop ?? data;
    const listWrapper = root?.[ref];

    if (!listWrapper) return [];

    let items;

    if (Array.isArray(listWrapper)) {
        items = listWrapper;
    } else if (typeof listWrapper === "object") {
        const childKey = Object.keys(listWrapper).find((k) => !k.startsWith("@_"));
        if (!childKey) return [];
        const child = listWrapper[childKey];
        items = Array.isArray(child) ? child : [child];
    } else {
        return [];
    }

    const ids = [];
    for (const item of items) {
        if (item && typeof item === "object") {
            const rawId = item.id ?? item["@_id"];
            if (rawId !== undefined && rawId !== null) {
                const id = String(rawId);
                if (id) ids.push(id);
            }
        }
    }

    return ids;
}

export function getList(ref, options = {}) {
    const normalizedRef = normalizeRef(ref);
    const params = buildListParams(options);

    return getJson(normalizedRef, {
        params, signal: options.signal, headers: options.headers,
    });
}

export function getById(ref, id, options = {}) {
    const normalizedRef = normalizeRef(ref);

    if (id === undefined || id === null || id === "") {
        throw new Error("id is required for getById");
    }

    return getJson(`${normalizedRef}/${id}`, {
        params: options.params, signal: options.signal, headers: options.headers,
    });
}

export function readResource(ref, options = {}) {
    if (options.id !== undefined && options.id !== null && options.id !== "") {
        return getById(ref, options.id, options);
    }

    return getList(ref, options);
}

export function createResource(ref, data, options = {}) {
    const normalizedRef = normalizeRef(ref);

    return sendJson("POST", normalizedRef, data, {
        params: options.params, headers: options.headers, signal: options.signal,
    });
}

export function updateResource(ref, id, data, options = {}) {
    const normalizedRef = normalizeRef(ref);

    if (id === undefined || id === null || id === "") {
        throw new Error("id is required for updateResource");
    }

    return sendJson("PUT", `${normalizedRef}/${id}`, data, {
        params: options.params, headers: options.headers, signal: options.signal,
    });
}
export function patchResource(ref, id, data, options = {}) {
    const normalizedRef = normalizeRef(ref);

    if (id === undefined || id === null || id === "") {
        throw new Error("id is required for patch");
    }

    return sendJson("PATCH", `${normalizedRef}/${id}`, data, {
        params: options.params, headers: options.headers, signal: options.signal,
    });
}

// Fix #6: destructure only known HTTP-level options instead of spreading the
// whole options object — prevents stray keys (listOptions, deleteOptions, etc.)
// from leaking into prestashopRequest / axios.
export async function deleteResource(ref, id, options = {}) {
    const normalizedRef = normalizeRef(ref);

    if (id === undefined || id === null || id === "") {
        throw new Error("id is required for deleteResource");
    }

    const endpoint = `${normalizedRef}/${id}`;
    const fullUrl = buildFullUrl(endpoint, options.params);

    try {
        const response = await prestashopRequest({
            method: "DELETE",
            endpoint,
            params: options.params,
            headers: options.headers,
            signal: options.signal,
        });

        emitApiResponse(
            buildApiSuccessPayload({
                method: "DELETE",
                endpoint,
                status: response?.status,
                statusText: response?.statusText,
                fullUrl,
            })
        );

        return response;
    } catch (err) {
        emitApiResponse(
            buildApiErrorPayload({
                error: err,
                method: "DELETE",
                endpoint,
                fullUrl,
            })
        );
        throw err;
    }
}

// Fix #7: pass only list-relevant options to getList, not the whole options
// object (which may carry deleteOptions or other unrelated keys).
export async function getAllIds(ref, options = {}) {
    const normalizedRef = normalizeRef(ref);

    const response = await getList(normalizedRef, {
        display: options.display ?? "[id]",
        sort: options.sort,
        limit: options.limit ?? "0,1000",
        filters: options.filters,
        params: options.params,
        headers: options.headers,
        signal: options.signal,
    });

    return parseIdsFromListData(response?.data, normalizedRef);
}

export async function resetDatabase(refs, options = {}) {
    if (!Array.isArray(refs)) {
        throw new Error("refs must be an array");
    }

    const results = [];

    for (const ref of refs) {
        const normalizedRef = normalizeRef(ref);
        let ids = [];
        let listError = null;

        try {
            ids = await getAllIds(normalizedRef, options.listOptions ?? {});
        } catch (err) {
            listError = err;
        }

        const deleted = [];
        const errors = [];

        if (!listError) {
            for (const id of ids) {
                try {
                    await deleteResource(normalizedRef, id, options.deleteOptions ?? {});
                    deleted.push(id);
                } catch (err) {
                    errors.push({id, error: err});
                }
            }
        }

        results.push({ref: normalizedRef, ids, deleted, errors, listError});
    }

    return results;
}