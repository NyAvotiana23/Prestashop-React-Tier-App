import axios from "axios";
import {XMLBuilder, XMLParser} from "fast-xml-parser";
import {cleanPrestashopJson} from "../utils/util-functions.js";

const baseUrl = import.meta.env.VITE_PRESTASHOP_API_URL;
const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY;

if (!baseUrl) {
    throw new Error("Missing VITE_PRESTASHOP_API_URL in .env");
}

if (!apiKey) {
    throw new Error("Missing VITE_PRESTASHOP_API_KEY in .env");
}

const authHeader = `Basic ${btoa(`${apiKey}:`)}`;

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_", // Fix #2: without isArray, a single-item list returns an object instead of
    // an array, making all list-handling code unpredictably fragile.
    // This ensures resource collection tags always parse as arrays.
    isArray: (tagName, jPath, isLeaf, isAttribute) => {
        // Any tag that is a direct child of the resource wrapper is a list item.
        // e.g. prestashop > products > product  →  product is always an array.
        const parts = jPath.split(".");
        const parent = parts[1];
        const isListWrapper = parent && parent.endsWith("s");
        return parts.length === 3 && isListWrapper && !isAttribute;
    },
});

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_", // Fix #3: PrestaShop expects CDATA-wrapped values. Without this, special
    // characters like &, <, >, accents will corrupt the XML payload.
    cdataPropName: "__cdata", // Suppress self-closing tags (<tag/>) — PrestaShop rejects them on writes.
    suppressEmptyNode: false,
});

const client = axios.create({
    baseURL: baseUrl, headers: {
        Authorization: authHeader, Accept: "application/xml",
    }, timeout: 20000,
});

function ensurePrestashopRoot(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("payload must be a non-empty object");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "prestashop")) {
        return payload;
    }

    return {prestashop: payload};
}

// Fix #1: wrap parse in try/catch and validate the result so that HTML error
// pages or malformed XML from PrestaShop surface as real errors immediately
// instead of silently returning garbage data.
export function parseXml(xml) {
    if (typeof xml !== "string") return xml;

    let parsed;
    try {
        parsed = xmlParser.parse(xml);
    } catch (err) {
        throw new Error(`XML parse failed: ${err.message}\n\nRaw response:\n${xml}`);
    }

    if (parsed === null || parsed === undefined || typeof parsed !== "object") {
        throw new Error(`XML parsed to an unexpected value: ${String(parsed)}`);
    }

    return parsed?.prestashop ?? parsed;
}

// Fix #5: wrap buildXml in try/catch so payload errors have useful context.
export function buildXml(payload) {
    const rootPayload = ensurePrestashopRoot(payload);

    let body;
    try {
        body = xmlBuilder.build(rootPayload);
    } catch (err) {
        throw new Error(`XML build failed: ${err.message}`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

export async function prestashopRequest({
                                            method, endpoint, params, xml, headers, responseType = "text", signal,
                                        }) {
    const config = {
        method, url: endpoint, params, data: xml, headers: {
            "Content-Type": xml ? "application/xml" : undefined, ...headers,
        }, responseType, signal,
    };

    return client.request(config);
}

export function getXml(endpoint, options = {}) {
    return prestashopRequest({
        method: "GET", endpoint, ...options,
    });
}

export function sendXml(method, endpoint, xml, options = {}) {
    return prestashopRequest({
        method, endpoint, xml, ...options,
    });
}

export async function getJson(endpoint, options = {}) {
    // Fix #4: destructure only the known options so that a caller-supplied
    // responseType (or any other stray key) cannot silently override "text"
    // and break XML parsing downstream.
    const {params, headers, signal} = options;

    try {
        const response = await prestashopRequest({
            method: "GET", endpoint, responseType: "text", params, headers, signal,
        });

        const rawXml = response?.data;
        const parsed = parseXml(rawXml);
        const data = cleanPrestashopJson(parsed);

        return {...response, data, rawXml};
    } catch (err) {
        throw new Error(formatPrestashopError(err, "GET", endpoint));
    }
}

export async function sendJson(method, endpoint, payload, options = {}) {
    // Fix #4: same explicit destructuring — responseType is always "text" here.
    const {params, headers, signal} = options;

    try {
        const xml = buildXml(payload);
        const response = await prestashopRequest({
            method, endpoint, xml, responseType: "text", params, headers, signal,
        });

        const rawXml = response?.data;
        const parsed = parseXml(rawXml);
        const data = cleanPrestashopJson(parsed);

        return {...response, data, rawXml};
    } catch (err) {
        throw new Error(formatPrestashopError(err, method, endpoint));
    }
}

function formatPrestashopError(error, method, endpoint) {
    if (!error) return `PrestaShop ${method} ${endpoint} failed.`;

    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const message = error?.message ?? "Unknown error";

    let detail = message;
    if (status) {
        detail = `${status} ${statusText ?? ""}`.trim();
    }

    return `PrestaShop ${method} ${endpoint} failed: ${detail}`;
}