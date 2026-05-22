import {deleteResource, getById, getList, createResource} from "../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue} from "../utils/util-functions.js";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const apiBaseUrl = import.meta.env.VITE_PRESTASHOP_API_URL;
const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY;

const imageBaseUrl = apiBaseUrl ? String(apiBaseUrl).replace(/\/+$/, "") : "";
const imageQuery = apiKey ? `?ws_key=${apiKey}` : "";

export function isProductDateHot(date) {
    date = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
}


export function calculateProductPriceTtx(priceHt, taxRate) {
    const parsedPriceHt = parseFloat(priceHt) ?? 0;
    const parsedTaxRate = Number(taxRate) || 0;
    return (parsedPriceHt * (1 + parsedTaxRate / 100)).toFixed(2);
}

export async function listProductWithALlPricing() {
    const productsResponse = await getList("products", {
        display: "full",
        sort: "[id_DESC]",
        params: {
            "price[price_ttc][use_tax]": 1,
            "price[price_ht][use_tax]": 0
        }
    });
    return normalizeProducts(productsResponse);
}


export async function listProductCombinationsWithALlPricing() {
    const combinationsResponse = await getList("combinations", {
        display: "full",
        sort: "[id_DESC]",
        params: {
            "price[price_ttc][use_tax]": 1,
            "price[price_ht][use_tax]": 0
        }
    });
    return normalizeCombinations(combinationsResponse);
}

export function isProductDateNew(date) {
    date = new Date(date);
    const now = new Date(Date.now());
    const oneWeekEarlier = new Date(now - 7 * 864e5);
    return date >= oneWeekEarlier && date <= now;
}

export async function getTaxRateForGroup(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;

    const rulesResponse = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit: "0,1",
    });
    const rule = ensureArray(rulesResponse?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) return 0;

    const taxResponse = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit: "0,1",
    });
    const tax = ensureArray(taxResponse?.data?.taxes?.tax ?? [])[0];
    return parseFloat(getScalarValue(tax?.rate) ?? "0");
}

export function normalizeCombinations(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.combinations?.combination ?? data?.combinations ?? data?.combination ?? [];
    return ensureArray(node);
}

export function normalizeProducts(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.products?.product ?? data?.products ?? data?.product ?? [];
    return ensureArray(node);
}

export function getProductLabel(product) {
    return getLanguageText(product?.name) || getScalarValue(product?.name) || "";
}

export async function fetchProductDetailExtras(product, {signal} = {}) {
    if (!product) {
        return {
            stockByAttribute: {},
            combinations: [],
            optionValueMap: {},
            optionGroupMap: {},
            imageIds: [],
            taxRate: 0,
        };
    }

    const productId = getScalarValue(product?.id);
    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate = await getTaxRateForGroup(taxRulesGroupId);

    const stockResponse = await getList("stock_availables", {
        display: "full",
        filters: {id_product: productId},
        limit: "0,200",
        signal,
    });
    const stockItems = ensureArray(stockResponse?.data?.stock_availables?.stock_available ?? []);
    const stockByAttribute = {};
    stockItems.forEach((item) => {
        const attributeId = getScalarValue(item?.id_product_attribute) || "0";
        stockByAttribute[String(attributeId)] = Number(getScalarValue(item?.quantity) || 0);
    });

    const combinationsResponse = await getList("combinations", {
        display: "full",
        filters: {id_product: productId},
        limit: "0,200",
        signal,
    });
    const combinations = ensureArray(
        combinationsResponse?.data?.combinations?.combination ?? []
    );

    const optionValueIds = new Set();
    combinations.forEach((combination) => {
        const values = ensureArray(
            combination?.associations?.product_option_values?.product_option_value ?? []
        );
        values.forEach((value) => {
            const valueId = getScalarValue(value?.id ?? value);
            if (valueId) optionValueIds.add(String(valueId));
        });
    });

    let optionValueMap = {};
    let optionGroupMap = {};

    if (optionValueIds.size > 0) {
        const optionValuesResponse = await getList("product_option_values", {
            display: "full",
            filters: {id: `[${[...optionValueIds].join("|")}]`},
            limit: `0,${optionValueIds.size}`,
            signal,
        });
        const optionValues = ensureArray(
            optionValuesResponse?.data?.product_option_values?.product_option_value ?? []
        );
        optionValueMap = {};
        const groupIds = new Set();
        optionValues.forEach((optionValue) => {
            const optionValueId = getScalarValue(optionValue?.id);
            const groupId = getScalarValue(optionValue?.id_attribute_group);
            if (optionValueId) {
                optionValueMap[String(optionValueId)] = {
                    name: getLanguageText(optionValue?.name),
                    groupId: groupId ? String(groupId) : "",
                };
            }
            if (groupId) groupIds.add(String(groupId));
        });

        if (groupIds.size > 0) {
            const groupsResponse = await getList("product_options", {
                display: "full",
                filters: {id: `[${[...groupIds].join("|")}]`},
                limit: `0,${groupIds.size}`,
                signal,
            });
            const groups = ensureArray(
                groupsResponse?.data?.product_options?.product_option ?? []
            );
            optionGroupMap = {};
            groups.forEach((group) => {
                const groupId = getScalarValue(group?.id);
                if (!groupId) return;
                optionGroupMap[String(groupId)] =
                    getLanguageText(group?.name) || `Option ${groupId}`;
            });
        }
    }

    const imageIds = extractProductImageIds(product);

    return {
        stockByAttribute,
        combinations,
        optionValueMap,
        optionGroupMap,
        imageIds,
        taxRate: taxRate || 0,
    };
}

export async function listProducts({display = "full", limit = 50, sort, filters, params, signal} = {}) {
    const response = await getList("products", {
        display,
        limit,
        sort,
        filters,
        params,
        signal,
    });
    return normalizeProducts(response?.data ?? response);
}

export async function getProductById(productId, {signal} = {}) {
    const response = await getById("products", productId, {signal});
    return response?.data?.product ?? null;
}

export async function deleteProductById(productId, options = {}) {
    return deleteResource("products", productId, options);
}

export async function getProductWholesalePrice(productId, {signal} = {}) {
    const response = await getList("products", {
        display: "[id,wholesale_price]",
        filters: {id: productId},
        limit: "0,1",
        signal,
    });
    const product = normalizeProducts(response?.data ?? response)[0];
    return getScalarValue(product?.wholesale_price);
}

export function extractProductImageIds(product) {
    const images = ensureArray(product?.associations?.images?.image ?? []);
    return images
        .map((image) => getScalarValue(image?.id ?? image))
        .filter(Boolean);
}

export async function getProductPricing(productId, combinationId) {
    const productResponse = await getList("products", {
        display: "full",
        filters: {id: productId},
        limit: "0,1",
    });
    const product = ensureArray(productResponse?.data?.products?.product ?? [])[0];
    if (!product) {
        throw new Error(`Produit introuvable: ${productId}`);
    }

    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate = taxRulesGroupId ? await getTaxRateForGroup(taxRulesGroupId) : 0;
    const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;

    let effectiveHt = baseHt;
    if (combinationId && String(combinationId) !== "0") {
        const comboResponse = await getList("combinations", {
            display: "full",
            filters: {id: combinationId},
            limit: "0,1",
        });
        const combo = ensureArray(comboResponse?.data?.combinations?.combination ?? [])[0];
        const deltaHt = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;
        effectiveHt = baseHt + deltaHt;
    }

    const priceTtc = effectiveHt * (1 + taxRate / 100);
    return {priceHt: effectiveHt, priceTtc};
}

export function buildImageUrl(productId, imageId) {
    if (!imageBaseUrl || !productId || !imageId) return "";
    return `${imageBaseUrl}/images/products/${productId}/${imageId}${imageQuery}`;
}

function normalizeSpecificPrices(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.specific_prices?.specific_price ?? data?.specific_prices ?? data?.specific_price ?? [];
    return ensureArray(node);
}

function normalizeSpecificPriceRules(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.specific_price_rules?.specific_price_rule ?? data?.specific_price_rules ?? data?.specific_price_rule ?? [];
    return ensureArray(node);
}

export async function listSpecificPrices({display = "full", limit = 50, sort, filters, params, signal} = {}) {
    const response = await getList("specific_prices", {
        display,
        limit,
        sort,
        filters,
        params,
        signal,
    });
    return normalizeSpecificPrices(response?.data ?? response);
}

export async function buildTaxRateMapForProducts(products) {
    const groupIds = [
        ...new Set(
            products
                .map((product) => getScalarValue(product?.id_tax_rules_group))
                .filter(Boolean)
                .map((id) => String(id))
        ),
    ];

    const map = {};
    await Promise.all(
        groupIds.map(async (groupId) => {
            try {
                const rate = await getTaxRateForGroup(groupId);
                map[groupId] = rate || 0;
            } catch {
                map[groupId] = 0;
            }
        })
    );

    return map;
}

export async function listSpecificPriceRules({display = "full", limit = 50, sort, filters, params, signal} = {}) {
    const response = await getList("specific_price_rules", {
        display,
        limit,
        sort,
        filters,
        params,
        signal,
    });
    return normalizeSpecificPriceRules(response?.data ?? response);
}

export async function getSpecificPricesByProductIds(productIds, options = {}) {
    const ids = ensureArray(productIds)
        .map((id) => String(id))
        .filter(Boolean);
    if (ids.length === 0) return [];

    const filters = {
        ...(options.filters ?? {}),
        id_product: `[${[...new Set(ids)].join("|")}]`,
    };

    return listSpecificPrices({
        display: options.display ?? "full",
        limit: options.limit ?? `0,${Math.max(200, ids.length)}`,
        sort: options.sort,
        filters,
        params: options.params,
        signal: options.signal,
    });
}

export function groupSpecificPricesByProduct(specificPrices) {
    const groups = {};
    ensureArray(specificPrices).forEach((item) => {
        const productId = getScalarValue(item?.id_product);
        if (!productId) return;
        const key = String(productId);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
}

export function buildSpecificPricePayload({
                                              productId,
                                              combinationId = 0,
                                              price = -1,
                                              reduction = 0,
                                              reductionType = "percentage",
                                              reductionTax = 1,
                                              fromQuantity = 1,
                                              idShopGroup = 0,
                                              idShop = 1,
                                              idCart = 0,
                                              idCurrency = 0,
                                              idCountry = 0,
                                              idGroup = 0,
                                              idCustomer = 0,
                                              idSpecificPriceRule = 0,
                                              from = "0000-00-00 00:00:00",
                                              to = "0000-00-00 00:00:00",
                                          } = {}) {
    if (!productId) {
        throw new Error("productId is required to build a specific price payload");
    }

    return {
        specific_price: {
            id_shop: idShop,
            id_shop_group: idShopGroup,
            id_cart: idCart,
            id_product: productId,
            id_product_attribute: combinationId ?? 0,
            id_currency: idCurrency,
            id_country: idCountry,
            id_group: idGroup,
            id_customer: idCustomer,
            id_specific_price_rule: idSpecificPriceRule,
            price,
            from_quantity: fromQuantity,
            reduction,
            reduction_tax: reductionTax,
            reduction_type: reductionType,
            from,
            to,
        },
    };
}

export async function createSpecificPrice(payload, options = {}) {
    return createResource("specific_prices", payload, options);
}

export async function createSpecificPriceReduction({
                                                       productId,
                                                       reduction,
                                                       reductionType = "percentage",
                                                       reductionTax = 1,
                                                       ...rest
                                                   } = {}, options = {}) {
    const payload = buildSpecificPricePayload({
        productId,
        reduction,
        reductionType,
        reductionTax,
        ...rest,
    });

    return createSpecificPrice(payload, options);
}

export function computeSpecificPriceFinalHt({basePriceHt, taxRate = 0, specificPrice}) {
    if (basePriceHt === undefined || basePriceHt === null || !specificPrice) return null;

    const base = Number(basePriceHt) || 0;
    const priceOverride = parseFloat(getScalarValue(specificPrice?.price) ?? "-1");
    const reduction = parseFloat(getScalarValue(specificPrice?.reduction) ?? "0");
    const reductionType = getScalarValue(specificPrice?.reduction_type) || "percentage";
    const reductionTax = String(getScalarValue(specificPrice?.reduction_tax) ?? "0") === "1";

    const working = priceOverride !== -1 ? priceOverride : base;

    if (!reduction || reduction <= 0) return working;

    if (reductionType === "percentage") {
        return working * (1 - reduction);
    }

    const rate = Number(taxRate) || 0;
    if (reductionTax) {
        return working - reduction / (1 + rate / 100);
    }

    return working - reduction;
}

export function pickBestSpecificPrice(specificPrices, {basePriceHt, taxRate} = {}) {
    const prices = ensureArray(specificPrices);
    if (prices.length === 0) return null;

    if (basePriceHt !== undefined && basePriceHt !== null) {
        let best = null;
        let bestPrice = null;
        prices.forEach((price) => {
            const finalHt = computeSpecificPriceFinalHt({
                basePriceHt,
                taxRate,
                specificPrice: price,
            });
            if (finalHt === null || Number.isNaN(finalHt)) return;
            if (bestPrice === null || finalHt < bestPrice) {
                bestPrice = finalHt;
                best = price;
            }
        });
        return best;
    }

    return prices
        .slice()
        .sort((a, b) => {
            const priceA = parseFloat(getScalarValue(a?.price) ?? "-1");
            const priceB = parseFloat(getScalarValue(b?.price) ?? "-1");
            if (priceA !== priceB) return priceA === -1 ? 1 : -1;
            const reductionA = parseFloat(getScalarValue(a?.reduction) ?? "0");
            const reductionB = parseFloat(getScalarValue(b?.reduction) ?? "0");
            return reductionB - reductionA;
        })[0];
}

export async function getReductionByProductIds(
    productIds,
    {basePricesHt, taxRateMap, ...listOptions} = {}
) {
    const prices = await getSpecificPricesByProductIds(productIds, listOptions);
    const grouped = groupSpecificPricesByProduct(prices);

    const result = {};
    Object.entries(grouped).forEach(([productId, items]) => {
        const basePriceHt = basePricesHt?.[productId];
        const taxRate = taxRateMap?.[productId];
        const best = pickBestSpecificPrice(items, {basePriceHt, taxRate});
        const finalPriceHt = best && basePriceHt !== undefined && basePriceHt !== null
            ? computeSpecificPriceFinalHt({basePriceHt, taxRate, specificPrice: best})
            : null;

        result[productId] = {
            bestSpecificPrice: best,
            finalPriceHt,
            specificPrices: items,
        };
    });

    return result;
}
