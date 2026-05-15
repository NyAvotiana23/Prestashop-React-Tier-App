export function ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}


export function isProductDateHot(date) {
    date = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);


    return date.toDateString() === yesterday.toDateString();
}
export function formatMoney(value) {
    const amount = Number.parseFloat(getScalarValue(value) || "");
    return Number.isFinite(amount) ? amount.toFixed(2) : "N/A";
}
export function isProductDateNew(date) {
    date = new Date(date);

    const now = new Date(Date.now());
    const oneWeekEarlier = new Date(now - 7 * 864e5);

    return date >= oneWeekEarlier && date <= now;

}

// Fix #1: always look for language id="1" explicitly rather than blindly
// taking items[0]. The order of language nodes in the XML is not guaranteed,
// so items[0] could be language 2 if PrestaShop returns them in a different
// order. Fall back to items[0] only when no language with id "1" is found.
export function getLanguageText(node, langId = "1") {
    if (!node) return "";

    const language = node.language ?? node;
    const items = ensureArray(language);

    // Try to find the requested language by id attribute.
    const match = items.find(
        (item) =>
            item &&
            typeof item === "object" &&
            String(item.id ?? item["@_id"]) === String(langId)
    );

    const target = match ?? items[0];

    if (!target) return "";
    if (typeof target === "string") return target;
    if (typeof target === "object") {
        if (target.value !== undefined) return String(target.value ?? "");
        if (target["#text"] !== undefined) return String(target["#text"] ?? "");
    }
    return "";
}

// Safely extract a scalar value from a node that may be a plain primitive
// or a fast-xml-parser object like { "#text": "value", "@_id": "1" }.
export function getScalarValue(node) {
    if (node === null || node === undefined) return "";
    if (typeof node === "object") {
        if (node.value !== undefined) return String(node.value ?? "");
        if (node["#text"] !== undefined) return String(node["#text"] ?? "");
        if (Object.keys(node).length === 1 && node.id !== undefined) {
            return String(node.id ?? "");
        }
        return "";
    }
    return node;
}

export function cleanPrestashopJson(input, options = {}) {
    const dropKeys = new Set(options.dropKeys ?? ["node"]);
    return cleanValue(input, dropKeys);
}

export function isAbortError(error, signal) {
    if (signal?.aborted) return true;
    return error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
}

function cleanValue(value, dropKeys) {
    if (Array.isArray(value)) {
        return value.map((item) => cleanValue(item, dropKeys));
    }

    if (value && typeof value === "object") {
        const keys = Object.keys(value);
        if (keys.length === 1 && keys[0] === "#text") {
            return cleanValue(value["#text"], dropKeys);
        }

        const result = {};
        let textValue;

        for (const [key, val] of Object.entries(value)) {
            if (dropKeys.has(key)) {
                continue;
            }

            if (key === "#text") {
                textValue = val;
                continue;
            }

            if (key.startsWith("@_")) {
                const nextKey = key.slice(2);
                if (nextKey) result[nextKey] = cleanValue(val, dropKeys);
                continue;
            }

            result[key] = cleanValue(val, dropKeys);
        }

        if (textValue !== undefined) {
            if (Object.keys(result).length === 0) {
                return cleanValue(textValue, dropKeys);
            }
            result.value = cleanValue(textValue, dropKeys);
        }

        return result;
    }

    return value;
}
