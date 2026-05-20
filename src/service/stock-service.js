import {getList} from "../api/prestashopCrud.js";
import {getScalarValue} from "../utils/util-functions.js";


function normalizeStockAvailables(data) {
    return data?.stock_availables?.stock_available ?? [];
}

export async function getStockByProductIds(productIds) {
    const stockAvailableResponse = await getList("stock_availables", {
        display: "full",
        sort: "[id_ASC]",
        filters: {
            id_product: `[${productIds}]`
        }
    });
    const stockAvailables = normalizeStockAvailables(stockAvailableResponse?.data);


    const productStock = {};

    for (const stock of stockAvailables) {
        const idProduct = getScalarValue(stock?.id_product);
        const idProductAttribute = getScalarValue(stock?.id_product_attribute);
        if (!productStock[String(idProduct)]) {
            productStock[String(idProduct)] = {};

        }
        productStock[String(idProduct)][String(idProductAttribute)] = parseFloat(stock?.quantity)
    }

    return productStock;
}

export function buildProductIdsForFilter(products) {
    const ids = [];
    for (const product of products) {

        const productId = product?.id;
        if (productId) {
            ids.push(productId);
        }
    }
    return ids.join("|");
}