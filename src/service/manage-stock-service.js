import {getList} from "../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue} from "../utils/util-functions.js";

const RESERVED_STATE_IDS = new Set(["2", "11"]);

function normalizeStockAvailables(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.stock_availables?.stock_available ??
        data?.stock_availables ??
        data?.stock_available ??
        [];
    return ensureArray(node);
}

function normalizeProducts(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.products?.product ?? data?.products ?? data?.product ?? [];
    return ensureArray(node);
}

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(node);
}

function normalizeCategories(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.categories?.category ?? data?.categories ?? data?.category ?? [];
    return ensureArray(node);
}

function toNumber(value, fallback = 0) {
    const parsed = Number(getScalarValue(value) ?? "");
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getOrderRows(order) {
    const rows =
        order?.associations?.order_rows?.order_row ??
        order?.associations?.order_rows ??
        [];
    return ensureArray(rows);
}

function getRowProductId(row) {
    return (
        getScalarValue(row?.product_id) ||
        getScalarValue(row?.id_product) ||
        ""
    );
}

function getRowAttributeId(row) {
    return (
        getScalarValue(row?.product_attribute_id) ||
        getScalarValue(row?.id_product_attribute) ||
        "0"
    );
}

function buildReservedMap(orders) {
    const map = new Map();

    orders.forEach((order) => {
        const state = getScalarValue(order?.current_state);
        if (state && !RESERVED_STATE_IDS.has(String(state))) return;

        const rows = getOrderRows(order);
        rows.forEach((row) => {
            const productId = getRowProductId(row);
            if (!productId) return;

            const attrId = getRowAttributeId(row) || "0";
            const qty = toNumber(row?.product_quantity, 0);
            const key = `${productId}::${attrId}`;
            map.set(key, (map.get(key) ?? 0) + qty);
        });
    });

    return map;
}

async function buildVariantLabels(combinationIds, signal) {
    if (!combinationIds.length) return {};

    const comboResponse = await getList("combinations", {
        display: "full",
        filters: {id: `[${combinationIds.join("|")}]`},
        limit: `0,${combinationIds.length}`,
        signal,
    });

    const combinations = ensureArray(
        comboResponse?.data?.combinations?.combination ?? []
    );

    const optionValueIds = new Set();
    combinations.forEach((comb) => {
        const values = ensureArray(
            comb?.associations?.product_option_values?.product_option_value ?? []
        );
        values.forEach((value) => {
            const valueId = getScalarValue(value?.id ?? value);
            if (valueId) optionValueIds.add(valueId);
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
        const groupResponse = await getList("product_options", {
            display: "full",
            filters: {id: `[${[...groupIds].join("|")}]`},
            limit: `0,${groupIds.size}`,
            signal,
        });

        const groups = ensureArray(
            groupResponse?.data?.product_options?.product_option ?? []
        );

        groups.forEach((group) => {
            const gid = getScalarValue(group?.id);
            if (gid) {
                optionGroupMap[String(gid)] =
                    getLanguageText(group?.name) || `Option ${gid}`;
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
            .map((value) => {
                const vid = getScalarValue(value?.id ?? value);
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

export async function fetchManageStockData({signal} = {}) {
    const [productsRes, ordersRes, categoriesRes] = await Promise.all([
        getList("products", {
            display: "[id,reference,name,id_category_default]",
            limit: "0,2000",
            signal,
        }),
        getList("orders", {
            display: "full",
            filters: {current_state: `[${[...RESERVED_STATE_IDS].join("|")}]`},
            limit: "0,1000",
            signal,
        }),
        getList("categories", {
            display: "[id,name]",
            limit: "0,2000",
            signal,
        }),
    ]);

    const products = normalizeProducts(productsRes?.data ?? productsRes);
    const orders = normalizeOrders(ordersRes?.data ?? ordersRes);
    const categories = normalizeCategories(categoriesRes?.data ?? categoriesRes);

    const productIds = products
        .map((product) => getScalarValue(product?.id))
        .filter(Boolean);

    if (!productIds.length) {
        return {rows: [], categoryRows: []};
    }

    const stockRes = await getList("stock_availables", {
        display: "[id,id_product,id_product_attribute,quantity]",
        sort: "[id_ASC]",
        filters: {id_product: `[${productIds.join("|")}]`},
        limit: "0,2000",
        signal,
    });

    const stocks = normalizeStockAvailables(stockRes?.data ?? stockRes);

    const productsById = Object.fromEntries(
        products.map((product) => [String(getScalarValue(product?.id)), product])
    );

    const categoriesById = Object.fromEntries(
        categories.map((category) => [String(getScalarValue(category?.id)), category])
    );

    const reservedByKey = buildReservedMap(orders);

    const combinationIds = [
        ...new Set(
            stocks
                .map((stock) => getScalarValue(stock?.id_product_attribute))
                .filter((id) => id && id !== "0")
        ),
    ];

    const variantLabels = await buildVariantLabels(combinationIds, signal);

    const combinationProductIds = new Set(
        stocks
            .filter((stock) => {
                const attrId = getScalarValue(stock?.id_product_attribute) || "0";
                return attrId !== "0";
            })
            .map((stock) => getScalarValue(stock?.id_product))
    );

    const visibleStocks = stocks.filter((stock) => {
        const attrId = getScalarValue(stock?.id_product_attribute) || "0";
        if (attrId !== "0") return true;
        const productId = getScalarValue(stock?.id_product);
        return !combinationProductIds.has(productId);
    });

    const rows = visibleStocks.map((stock) => {
        const stockId = getScalarValue(stock?.id) || "";
        const productId = getScalarValue(stock?.id_product) || "";
        const attrId = getScalarValue(stock?.id_product_attribute) || "0";

        const product = productsById[productId];
        const productName =
            getLanguageText(product?.name) || `Produit ${productId}`;
        const reference = getScalarValue(product?.reference) || `#${productId}`;

        const categoryId = getScalarValue(product?.id_category_default) || "";
        const category = categoriesById[categoryId];
        const categoryName = category
            ? getLanguageText(category?.name)
            : null;

        const variantLabel =
            attrId !== "0" ? variantLabels[attrId] || `#${attrId}` : "";
        const articleLabel = variantLabel
            ? `${productName} — ${variantLabel}`
            : productName;

        const physical = toNumber(stock?.quantity, 0);
        const reserved = reservedByKey.get(`${productId}::${attrId}`) ?? 0;
        const available = physical - reserved;

        return {
            stockId,
            productId,
            attrId,
            articleLabel,
            productName,
            variantLabel,
            reference,
            categoryId,
            categoryName,
            physical,
            reserved,
            available,
        };
    }).filter((row) => row.categoryName);

    const categoryMap = new Map();

    rows.forEach((row) => {
        const key = row.categoryId || "";
        if (!categoryMap.has(key)) {
            categoryMap.set(key, {
                categoryId: row.categoryId || "",
                categoryName: row.categoryName || "",
                physical: 0,
                reserved: 0,
                available: 0,
                count: 0,
            });
        }

        const entry = categoryMap.get(key);
        entry.physical += row.physical;
        entry.reserved += row.reserved;
        entry.available += row.available;
        entry.count += 1;
    });

    const categoryRows = [...categoryMap.values()].sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName, "fr-FR")
    );

    return {rows, categoryRows};
}

export {RESERVED_STATE_IDS};
