import JSZip from "jszip";
import {parseXml, prestashopRequest} from "../../api/prestashopApi.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {findProductByReference} from "./csvMappingUtils.js";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

function getFileExtension(fileName) {
    const normalized = String(fileName ?? "");
    const dotIndex = normalized.lastIndexOf(".");
    return dotIndex >= 0 ? normalized.slice(dotIndex + 1).toLowerCase() : "";
}

function parseImageName(fileName) {
    const baseName = String(fileName ?? "").split(/[/\\]/).pop();
    const dotIndex = baseName.lastIndexOf(".");
    const nameWithoutExt = dotIndex >= 0 ? baseName.slice(0, dotIndex) : baseName;
    const parts = nameWithoutExt.split("_").filter(Boolean);

    if (parts.length < 2) {
        return {reference: "", imageName: "", optionValue: ""};
    }

    if (parts.length >= 3) {
        return {
            reference: parts[0],
            imageName: parts.slice(1, -1).join("_"),
            optionValue: parts[parts.length - 1],
        };
    }

    return {
        reference: parts[0],
        imageName: parts.slice(1).join("_"),
        optionValue: "",
    };
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

    const parsed = parseXml(response?.data);
    const imageId = getScalarValue(parsed?.image?.id ?? parsed?.images?.image?.id ?? "");
    return {response, imageId};
}

export async function importImagesFromZip({zipFile, onProgress, signal}) {
    if (!zipFile) {
        throw new Error("Missing zip file");
    }

    const zip = await JSZip.loadAsync(zipFile);
    const files = Object.values(zip.files).filter((file) => !file.dir);
    const imageEntries = files.filter((file) => IMAGE_EXTENSIONS.has(getFileExtension(file.name)));

    const created = [];
    const errors = [];
    const warnings = [];
    const total = imageEntries.length;

    for (let index = 0; index < imageEntries.length; index += 1) {
        if (signal?.aborted) break;

        const entry = imageEntries[index];
        const {reference, imageName, optionValue} = parseImageName(entry.name);

        if (!reference || !imageName) {
            errors.push({index, error: new Error(`Invalid filename: ${entry.name}`)});
            onProgress?.({index, total, status: "error"});
            continue;
        }

        try {
            const product = await findProductByReference(reference);
            if (!product) {
                throw new Error(`Product not found for reference: ${reference}`);
            }

            const productId = getScalarValue(product?.id);
            const fileBlob = await entry.async("blob");

            await uploadProductImage(productId, fileBlob, entry.name, signal);
            if (optionValue) {
                warnings.push({index, warning: `Option value ignored: ${optionValue}`});
            }

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

