import {getList} from "../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue} from "../utils/util-functions.js";

const DEFAULT_SALES_STATE_IDS = new Set(["2", "5", "11"]);

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

function normalizeStockMovements(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.stock_mvts?.stock_mvt ??
        [];
    return ensureArray(node);
}

function normalizeProducts(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.products?.product ?? data?.products ?? data?.product ?? [];
    return ensureArray(node);
}

function normalizeCategories(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.categories?.category ?? data?.categories ?? data?.category ?? [];
    return ensureArray(node);
}

function toFloat(value) {
    const n = Number.parseFloat(getScalarValue(value) ?? "");
    return Number.isFinite(n) ? n : 0;
}

function toInt(value, fallback = 0) {
    const n = Number.parseInt(getScalarValue(value) ?? "", 10);
    return Number.isFinite(n) ? n : fallback;
}

function getOrderRows(order) {
    const rows = order?.associations?.order_rows?.order_row
        ?? order?.associations?.order_rows
        ?? [];
    return ensureArray(rows);
}

function getRowProductId(row) {
    return getScalarValue(row?.product_id) || getScalarValue(row?.id_product) || "";
}

function getRowProductName(row) {
    return getScalarValue(row?.product_name) || "";
}

function getProductCategoryId(product) {
    return getScalarValue(product?.id_category_default) || "0";
}

function getProductName(product) {
    return getLanguageText(product?.name) || getScalarValue(product?.name) || "";
}

function getProductWholesalePrice(product) {
    return toFloat(product?.wholesale_price);
}

function getRowWholesalePrice(row, product) {
    const fromRow = toFloat(row?.original_wholesale_price || row?.purchase_supplier_price);
    if (fromRow > 0) return fromRow;
    return getProductWholesalePrice(product);
}

function isValidatedOrder(order, validStateIds) {
    const state = getScalarValue(order?.current_state);
    console.log(state);
    return validStateIds.has(String(state));
}

function buildSalesStats(orders, validStateIds = DEFAULT_SALES_STATE_IDS) {
    const validatedOrders = orders.filter((order) => isValidatedOrder(order, validStateIds));

    let totalPaid = 0;
    let totalPaidTaxExcl = 0;
    let totalProductsTaxIncl = 0;
    let totalProductsTaxExcl = 0;

    validatedOrders.forEach((order) => {
        totalPaid += toFloat(order?.total_paid);
        totalPaidTaxExcl += toFloat(order?.total_paid_tax_excl);

        const rows = getOrderRows(order);
        rows.forEach((row) => {
            const quantity = toInt(row?.product_quantity, 1) || 1;
            totalProductsTaxIncl += toFloat(row?.unit_price_tax_incl) * quantity;
            totalProductsTaxExcl += toFloat(row?.unit_price_tax_excl) * quantity;
        });
    });

    return {
        count: validatedOrders.length,
        total_paid: totalPaid,
        total_paid_tax_excl: totalPaidTaxExcl,
        total_products_tax_incl: totalProductsTaxIncl,
        total_products_tax_excl: totalProductsTaxExcl,
    };
}

function buildPurchaseStats(movements) {
    const incoming = movements.filter((mvt) => {
        const idOrder = String(getScalarValue(mvt?.id_order) ?? "0");
        const sign = Number(getScalarValue(mvt?.sign) ?? 0);
        return idOrder === "0" && sign === 1;
    });

    let totalAchat = 0;
    let totalQuantity = 0;

    incoming.forEach((mvt) => {
        const quantity = toFloat(mvt?.physical_quantity);
        const priceTe = toFloat(mvt?.price_te);
        totalAchat += quantity * priceTe;
        totalQuantity += quantity;
    });

    return {
        count: incoming.length,
        total_quantity: totalQuantity,
        total_achat: totalAchat,
    };
}

function buildLocalPurchaseStats(orders, productsById, validStateIds = DEFAULT_SALES_STATE_IDS) {
    const validatedOrders = orders.filter((order) => isValidatedOrder(order, validStateIds));

    let totalAchat = 0;
    let totalQuantity = 0;
    let totalLines = 0;

    validatedOrders.forEach((order) => {
        const rows = getOrderRows(order);
        rows.forEach((row) => {
            const productId = getRowProductId(row);
            if (!productId) return;
            const product = productsById[String(productId)];
            const quantity = toInt(row?.product_quantity, 1) || 1;
            const wholesalePrice = getRowWholesalePrice(row, product);
            totalAchat += quantity * wholesalePrice;
            totalQuantity += quantity;
            totalLines += 1;
        });
    });

    return {
        count: totalLines,
        total_quantity: totalQuantity,
        total_achat: totalAchat,
    };
}

function buildProductStats({orders, movements, products, categories, validStateIds}) {
    const productsById = Object.fromEntries(
        products.map((product) => [String(getScalarValue(product?.id)), product])
    );

    const categoriesById = Object.fromEntries(
        categories.map((category) => [String(getScalarValue(category?.id)), category])
    );

    const productStats = new Map();

    function ensureProductStat(productId) {
        const product = productsById[String(productId)];
        const categoryId = getProductCategoryId(product);
        const category = categoriesById[String(categoryId)];
        const productName = getProductName(product) || `#${productId}`;
        const categoryName = getLanguageText(category?.name) || "Inconnu";

        if (!productStats.has(String(productId))) {
            productStats.set(String(productId), {
                productId: String(productId),
                productName,
                categoryId: String(categoryId),
                categoryName,
                salesHt: 0,
                achatLocalHt: 0,
                achatGlobalHt: 0,
                beneficeLocalHt: 0,
                beneficeGlobalHt: 0,
            });
        }

        return productStats.get(String(productId));
    }

    const validatedOrders = orders.filter((order) => isValidatedOrder(order, validStateIds));
    validatedOrders.forEach((order) => {
        const rows = getOrderRows(order);
        rows.forEach((row) => {
            const productId = getRowProductId(row);
            if (!productId) return;
            const stats = ensureProductStat(productId);
            const quantity = toInt(row?.product_quantity, 1) || 1;
            const salesLine = toFloat(row?.unit_price_tax_excl) * quantity;
            const product = productsById[String(productId)];
            const wholesalePrice = getRowWholesalePrice(row, product);
            const localAchatLine = wholesalePrice * quantity;

            stats.salesHt += salesLine;
            stats.achatLocalHt += localAchatLine;

            if (!stats.productName && getRowProductName(row)) {
                stats.productName = getRowProductName(row);
            }
        });
    });

    movements.forEach((mvt) => {
        const idOrder = String(getScalarValue(mvt?.id_order) ?? "0");
        const sign = Number(getScalarValue(mvt?.sign) ?? 0);
        if (idOrder !== "0" || sign !== 1) return;

        const productId = getScalarValue(mvt?.id_product);
        if (!productId) return;
        const stats = ensureProductStat(productId);

        const quantity = toFloat(mvt?.physical_quantity);
        const priceTe = toFloat(mvt?.price_te);
        stats.achatGlobalHt += quantity * priceTe;
    });

    const categoryStats = new Map();
    productStats.forEach((stats) => {
        stats.beneficeLocalHt = stats.salesHt - stats.achatLocalHt;
        stats.beneficeGlobalHt = stats.salesHt - stats.achatGlobalHt;

        const key = stats.categoryId || "0";
        if (!categoryStats.has(key)) {
            categoryStats.set(key, {
                categoryId: key,
                categoryName: stats.categoryName || "Inconnu",
                salesHt: 0,
                achatLocalHt: 0,
                achatGlobalHt: 0,
                beneficeLocalHt: 0,
                beneficeGlobalHt: 0,
            });
        }

        const agg = categoryStats.get(key);
        agg.salesHt += stats.salesHt;
        agg.achatLocalHt += stats.achatLocalHt;
        agg.achatGlobalHt += stats.achatGlobalHt;
        agg.beneficeLocalHt += stats.beneficeLocalHt;
        agg.beneficeGlobalHt += stats.beneficeGlobalHt;
    });

    const productRows = Array.from(productStats.values()).sort((a, b) => {
        const cat = a.categoryName.localeCompare(b.categoryName);
        if (cat !== 0) return cat;
        return a.productName.localeCompare(b.productName);
    });

    const categoryRows = Array.from(categoryStats.values()).sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
    );

    return {productRows, categoryRows};
}

export async function fetchStatistics({signal, validStateIds} = {}) {
    const [ordersRes, stockRes, productsRes, categoriesRes] = await Promise.all([
        getList("orders", {display: "full", sort: "[id_ASC]", signal}),
        getList("stock_movements", {display: "full", sort: "[id_ASC]", signal}),
        getList("products", {display: "[id,name,id_category_default,wholesale_price]", limit: "0,2000", signal}),
        getList("categories", {display: "[id,name]", limit: "0,2000", signal}),
    ]);

    const orders = normalizeOrders(ordersRes?.data ?? ordersRes);
    const movements = normalizeStockMovements(stockRes?.data ?? stockRes);
    const products = normalizeProducts(productsRes?.data ?? productsRes);
    const categories = normalizeCategories(categoriesRes?.data ?? categoriesRes);

    const sales = buildSalesStats(orders, validStateIds ?? DEFAULT_SALES_STATE_IDS);
    const purchases = buildPurchaseStats(movements);

    const productsById = Object.fromEntries(
        products.map((product) => [String(getScalarValue(product?.id)), product])
    );

    const purchasesLocal = buildLocalPurchaseStats(
        orders,
        productsById,
        validStateIds ?? DEFAULT_SALES_STATE_IDS
    );

    const {productRows, categoryRows} = buildProductStats({
        orders,
        movements,
        products,
        categories,
        validStateIds: validStateIds ?? DEFAULT_SALES_STATE_IDS,
    });

    const profitGlobal = sales.total_products_tax_excl - purchases.total_achat;
    const profitLocal = sales.total_products_tax_excl - purchasesLocal.total_achat;

    return {
        sales,
        purchases,
        purchasesLocal,
        profitGlobal,
        profitLocal,
        productRows,
        categoryRows,
    };
}

export {DEFAULT_SALES_STATE_IDS};
