import {ensureArray} from "../utils/util-functions.js";
import {getList} from "../api/prestashopCrud.js";

export function normalizeCategories(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.categories?.category ?? data?.categories ?? data?.category ?? [];
    return ensureArray(node);


}

export async function listCategories () {
    const result = await getList("categories", {
        display: "full"
    });
    return normalizeCategories(result?.data);
}