import {getById, getList, patchResource} from "../api/prestashopCrud.js";
import {createStockMvt} from "../csv/mappings/csvMappingUtils.js";
import {ensureArray, getLanguageText, getScalarValue} from "../utils/util-functions.js";
import {buildProductIdsFilterFromOrderRows, getOrderById, getOrderRows} from "./order-service.js";


export function normalizeStockAvailables(data) {
    return ensureArray(data?.stock_availables?.stock_available ?? data?.stock_availables ?? []);
}

export async function patchStockAvailableForCategorieId(nombre, categorieId) {
    const nombreFloat = Number(nombre);

    const productsResult = await getList("products", {
        display: "full",
        filters: {
            id_category_default: categorieId
        }
    });

    const products = normalizeProducts(productsResult?.data);

    const rapport = {
        total: 0,
        realise: 0,
    }
    for (const product of products) {
        const productId = getScalarValue(product?.id);
        const res = await patchStockAvailabaleForProductId(nombreFloat, productId);
        rapport.total += res.total;
        rapport.realise += res.realise;

    }

    return rapport;
}

export async function patchStockAvailabaleForProductId(nombreDecrease, productId) {
    const stockAvailableRes = await getList("stock_availables", {
        display: "full",
        filters: {
            id_product: productId
        }
    });

    const stockAvailables = normalizeStockAvailables(stockAvailableRes?.data);

    const res = {
        total: 0,
        realise: 0,
    }

    const productHasCombinations = stockAvailables.length > 1;

    console.log("Product has combinations : " + productHasCombinations);

    // 52
    // 31
    for (const stockAvailable of stockAvailables) {
        const productStockId = getScalarValue(stockAvailable?.id_product);
        const productAttributeId = getScalarValue(stockAvailable?.id_product_attribute);

        console.log("Product attribute id : " + productAttributeId)
        if (productHasCombinations) {
            if (productAttributeId === 0) {
                console.log("Continuer ! ");
                continue;
            }
        }

        const stockAvailableId = getScalarValue(stockAvailable?.id);


        const stock = Number(getScalarValue(stockAvailable?.quantity));

        const quantityRealise = Math.max(0, stock - nombreDecrease);

        let theorique = Math.min(stock, nombreDecrease);
        let newVal = stock - theorique;


        await patchResource("stock_availables", stockAvailableId, {
            stock_availables: {
                id: stockAvailableId,
                quantity: newVal
            }
        });

        console.log("Stock : " + stock);
        console.log("Quantite new val : " + newVal + " Quantite realise : " + quantityRealise);
        console.log("Nanalana : " + theorique);


        res.total += nombreDecrease;
        res.realise += theorique;


    }


    return res;
}

export async function getStockAvailableById(id) {
    const response = await getById("stock_availables", id);
    return response?.data?.stock_available ?? null;

}

export function normalizeStockMovements(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.stock_movements?.stock_movement ??
        data?.stock_mvts?.stock_mvt ??
        data?.stock_movement ??
        data?.stock_mvt ??
        data?.stock_movements ??
        data?.stock_mvts ??
        [];
    return ensureArray(node);
}

function normalizeProducts(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.products?.product ?? data?.products ?? data?.product ?? [];
    return ensureArray(node);
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

export async function checkStockFromOrderId(orderId, multiplication = 1) {
    const order = await getOrderById(orderId);
    const orderRows = getOrderRows(order)
    return checkStockFromOrderItems(orderRows, multiplication);
}

export async function checkStockFromOrderItems(orderRows, multiplication = 1) {
    const productIds = buildProductIdsFilterFromOrderRows(orderRows);
    const stockAvailable = await getStockByProductIds(productIds);


    for (const row of orderRows) {
        const productId = getScalarValue(row?.product_id ?? row?.id_product ?? row?.productId ?? row?.product_id);
        const productAttribute = getScalarValue(row?.product_attribute_id ?? row?.id_product_attribute ?? "0");
        const quantity = parseFloat(getScalarValue(row?.product_quantity ?? row?.quantity)) * Number(multiplication);

        const stock = stockAvailable?.[String(productId)]?.[String(productAttribute)] ?? 0;

        if (stock < quantity) return false;
    }
    return true;
}


export async function fetchProducts({display = "full", limit, sort, filters, signal} = {}) {
    const response = await getList("products", {
        display,
        limit,
        sort,
        filters,
        signal,
    });
    return normalizeProducts(response?.data ?? response);
}

export async function fetchCombinations({display = "full", limit, filters, signal} = {}) {
    const response = await getList("combinations", {
        display,
        limit,
        filters,
        signal,
    });
    return ensureArray(response?.data?.combinations?.combination ?? []);
}

export async function fetchStockAvailables({display = "full", limit, sort, filters, signal} = {}) {
    const response = await getList("stock_availables", {
        display,
        limit,
        sort,
        filters,
        signal,
    });
    return normalizeStockAvailables(response?.data ?? response);
}

export async function fetchProductReferences(productIds, {signal} = {}) {
    if (!productIds.length) return {};
    const response = await getList("products", {
        display: "[id,reference]",
        filters: {id: `[${productIds.join("|")}]`},
        limit: `0,${productIds.length}`,
        signal,
    });
    const products = normalizeProducts(response?.data ?? response);
    return products.reduce((acc, product) => {
        const id = getScalarValue(product?.id);
        if (id) acc[String(id)] = getScalarValue(product?.reference) || `#${id}`;
        return acc;
    }, {});
}

export async function buildVariantLabelMapFromCombinations(combinations, {signal} = {}) {
    if (!combinations.length) return {};

    const optionValueIds = new Set();
    combinations.forEach((comb) => {
        const values = ensureArray(
            comb?.associations?.product_option_values?.product_option_value ?? []
        );
        values.forEach((v) => {
            const vid = getScalarValue(v?.id ?? v);
            if (vid) optionValueIds.add(vid);
        });
    });

    if (!optionValueIds.size) return {};

    const ovResponse = await getList("product_option_values", {
        display: "full",
        filters: {id: `[${[...optionValueIds].join("|")}]`},
        limit: `0,${optionValueIds.size}`,
        signal,
    });
    const optionValues = ensureArray(
        ovResponse?.data?.product_option_values?.product_option_value ?? []
    );

    const optionValueMap = {};
    const groupIds = new Set();
    optionValues.forEach((ov) => {
        const ovId = getScalarValue(ov?.id);
        const groupId = getScalarValue(ov?.id_attribute_group);
        if (ovId) {
            optionValueMap[String(ovId)] = {
                name: getLanguageText(ov?.name) || String(ovId),
                groupId: groupId ? String(groupId) : "",
            };
        }
        if (groupId) groupIds.add(String(groupId));
    });

    const optionGroupMap = {};
    if (groupIds.size > 0) {
        const grpResponse = await getList("product_options", {
            display: "full",
            filters: {id: `[${[...groupIds].join("|")}]`},
            limit: `0,${groupIds.size}`,
            signal,
        });
        const groups = ensureArray(
            grpResponse?.data?.product_options?.product_option ?? []
        );
        groups.forEach((g) => {
            const gid = getScalarValue(g?.id);
            if (gid) {
                optionGroupMap[String(gid)] = getLanguageText(g?.name) || `Option ${gid}`;
            }
        });
    }

    const labels = {};
    combinations.forEach((comb) => {
        const combId = getScalarValue(comb?.id);
        if (!combId) return;

        const values = ensureArray(
            comb?.associations?.product_option_values?.product_option_value ?? []
        );
        const parts = values
            .map((v) => {
                const vid = getScalarValue(v?.id ?? v);
                const ov = optionValueMap[String(vid)];
                if (!ov) return null;
                const groupName = optionGroupMap[ov.groupId] || "";
                return groupName ? `${groupName}: ${ov.name}` : ov.name;
            })
            .filter(Boolean);

        labels[String(combId)] = parts.length ? parts.join(" · ") : `#${combId}`;
    });

    return labels;
}

export async function buildVariantLabelMapFromCombinationIds(combinationIds, {signal} = {}) {
    if (!combinationIds.length) return {};
    const combinations = await fetchCombinations({
        display: "full",
        filters: {id: `[${combinationIds.join("|")}]`},
        limit: `0,${combinationIds.length}`,
        signal,
    });
    return buildVariantLabelMapFromCombinations(combinations, {signal});
}

export async function fetchStockMovementsForProduct({productId, combinationId, selectedDate, signal} = {}) {
    if (!productId) return [];

    const stockFilters = {id_product: productId};
    if (combinationId !== undefined && combinationId !== null && combinationId !== "") {
        stockFilters.id_product_attribute = combinationId;
    }

    const stockItems = await fetchStockAvailables({
        display: "full",
        filters: stockFilters,
        limit: "0,200",
        signal,
    });

    if (!stockItems.length) return [];

    const stockIds = stockItems
        .map((s) => getScalarValue(s?.id))
        .filter(Boolean);

    const allMovements = (
        await Promise.all(
            stockIds.map((stockId) =>
                getList("stock_movements", {
                    display: "full",
                    sort: "[id_DESC]",
                    filters: {id_stock: stockId},
                    limit: "0,500",
                    signal,
                }).then((r) => normalizeStockMovements(r?.data ?? r))
            )
        )
    ).flat();

    allMovements.sort((a, b) => {
        const ia = Number(getScalarValue(a?.id) || 0);
        const ib = Number(getScalarValue(b?.id) || 0);
        return ib - ia;
    });

    if (!selectedDate) return allMovements;

    return allMovements.filter((mvt) => {
        const raw = getScalarValue(mvt?.date_add);
        return raw ? String(raw).slice(0, 10) === selectedDate : false;
    });
}

export async function updateStockAvailableQuantity(stock, newQty, {signal} = {}) {
    const stockId = getScalarValue(stock?.id);
    const productId = getScalarValue(stock?.id_product);
    const attrId = getScalarValue(stock?.id_product_attribute) || "0";

    if (!stockId || !productId) {
        throw new Error("Id stock ou produit introuvable.");
    }

    await patchResource("stock_availables", stockId, {
        stock_available: {
            id: stockId,
            id_product: productId,
            id_product_attribute: attrId,
            quantity: String(newQty),
            depends_on_stock: getScalarValue(stock?.depends_on_stock) || "0",
            out_of_stock: getScalarValue(stock?.out_of_stock) || "0",
        },
    }, {signal});

    return stockId;
}

export async function recordStockMovementForOrderRow({productId, combinationId, orderId, quantity, priceHt, dateAdd}) {
    const stockItems = await fetchStockAvailables({
        display: "full",
        filters: {
            id_product: productId,
            id_product_attribute: combinationId || "0",
        },
        limit: "0,1",
    });

    const stockId = getScalarValue(stockItems[0]?.id);
    if (!stockId) {
        return null;
    }

    await createStockMvt(
        {
            id_product: productId,
            id_product_attribute: combinationId || "0",
            id_stock: stockId,
            id_order: orderId,
            date_add: dateAdd,
            quantity: -Math.abs(quantity),
            price_te: String(priceHt ?? "0"),
        },
        "Commande client"
    );

    return stockId;
}

export async function createStockMovement(stockMvt, reason) {
    return createStockMvt(stockMvt, reason);
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