/**
 * imageMappingZip.js
 *
 * Imports product images from a ZIP file.
 * File names must follow the pattern: {product_reference}.{ext}
 * Uses the shared PRODUCTS_CACHE so a product already looked up during a
 * product/combination import is not re-fetched.
 */

import JSZip from "jszip";
import {parseXml, prestashopRequest} from "../../api/prestashopApi.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {findProductByReference} from "./csvMappingUtils.js";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getFileExtension(fileName) {
    const normalized = String(fileName ?? "");
    const dotIndex = normalized.lastIndexOf(".");
    return dotIndex >= 0 ? normalized.slice(dotIndex + 1).toLowerCase() : "";
}

function parseImageName(fileName) {
    const baseName = String(fileName ?? "").split(/[/\\]/).pop();
    const dotIndex = baseName.lastIndexOf(".");
    const nameWithoutExt = dotIndex >= 0 ? baseName.slice(0, dotIndex) : baseName;
    return {baseName, productRef: nameWithoutExt};
}

async function uploadProductImage(productId, fileBlob, fileName, signal) {
    const formData = new FormData();
    formData.append("image", fileBlob, fileName);

    const response = await prestashopRequest({
        method: "POST",
        endpoint: `images/products/${productId}`,
        data: formData,
        responseType: "text",
        signal,
    });

    try {
        // Best-effort parse — PrestaShop sometimes returns HTML/empty on success
        parseXml(response?.data);
    } catch {
        // Ignore: upload already succeeded (2xx)
    }

    return {response};
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function importImagesFromZip({zipFile, onProgress, signal}) {
    if (!zipFile) throw new Error("Missing zip file");

    const zip = await JSZip.loadAsync(zipFile);
    const allFiles = Object.values(zip.files).filter((file) => !file.dir);
    const imageEntries = allFiles.filter((file) => {
        // const isNested  = file.name.includes("/");
        const isMacJunk = file.name.startsWith("__MACOSX");
        return !isMacJunk && IMAGE_EXTENSIONS.has(getFileExtension(file.name));
    });

    const created = [];
    const errors = [];
    const warnings = [];
    const total = imageEntries.length;

    for (let index = 0; index < imageEntries.length; index += 1) {
        if (signal?.aborted) break;

        const entry = imageEntries[index];
        const {baseName, productRef} = parseImageName(entry.name);

        if (!baseName || !productRef) {
            errors.push({index, error: new Error(`Invalid filename: ${entry.name}`)});
            onProgress?.({index, total, status: "error"});
            continue;
        }

        try {
            // findProductByReference checks PRODUCTS_CACHE first
            const product = await findProductByReference(productRef);
            if (!product) throw new Error(`Product not found for reference: ${productRef}`);

            const productId = getScalarValue(product?.id);
            const fileBlob = await entry.async("blob");

            await uploadProductImage(productId, fileBlob, entry.name, signal);

            created.push({index, productId, file: entry.name});
            onProgress?.({index, total, status: "created"});
        } catch (error) {
            errors.push({index, error});
            onProgress?.({index, total, status: "error"});
        }
    }

    return {
        type: "zip",
        ok: errors.length === 0,
        created,
        errors,
        warnings,
        total,
    };
}