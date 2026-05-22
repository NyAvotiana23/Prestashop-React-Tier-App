import {ensureArray, getScalarValue} from "../utils/util-functions.js";
import {getList} from "../api/prestashopCrud.js";

export async function getFirstResourceId(ref, {filters, signal} = {}) {
    const response = await getList(ref, {
        display: "[id]",
        limit: "0,1",
        filters,
        signal,
    });
    const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    const items = ensureArray(node);
    const first = items[0];
    return getScalarValue(first?.id || first?.["@_id"]);
}