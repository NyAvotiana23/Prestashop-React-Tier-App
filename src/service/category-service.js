import {ensureArray} from "../utils/util-functions.js";

export function normalizeCategories(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.categories?.category ?? data?.categories ?? data?.category ?? [];
    return ensureArray(node);
}