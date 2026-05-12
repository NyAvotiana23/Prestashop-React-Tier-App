import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {getById, getList} from "../../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCart} from "../../hooks/useCart.jsx";
import {getTaxRateForGroup} from "../../csv/mappings/csvMappingUtils.js";

export default function FrontProductDetail() {
    const {productId} = useParams();
    const {addItem} = useCart();
    const [product, setProduct] = useState(null);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [combinationQuantities, setCombinationQuantities] = useState({});

    function getCombinationQty(combinationId) {
        return combinationQuantities[String(combinationId)] ?? 1;
    }

    function setCombinationQty(combinationId, value) {
        const next = Math.max(1, Number(value) || 1);
        setCombinationQuantities((prev) => ({...prev, [String(combinationId)]: next}));
    }
    const [combinations, setCombinations] = useState([]);
    const [optionValueMap, setOptionValueMap] = useState({});
    const [optionGroupMap, setOptionGroupMap] = useState({});
    const [stockByAttribute, setStockByAttribute] = useState({});
    const [imageIds, setImageIds] = useState([]);
    const [taxRate, setTaxRate] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadProduct() {
            if (!productId) return;
            try {
                setStatus("loading");
                setError(null);

                const response = await getById("products", productId, {
                    signal: controller.signal,
                });

                const nextProduct = response?.data?.product ?? null;
                setProduct(nextProduct);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadProduct();
        return () => controller.abort();
    }, [productId]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadExtras() {
            if (!product) return;

            try {
                const productId = getScalarValue(product?.id);
                const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
                const nextTaxRate = await getTaxRateForGroup(taxRulesGroupId);
                setTaxRate(nextTaxRate || 0);

                const stockResponse = await getList("stock_availables", {
                    display: "full",
                    filters: {id_product: productId},
                    limit: "0,200",
                    signal: controller.signal,
                });
                const stockItems = ensureArray(stockResponse?.data?.stock_availables?.stock_available ?? []);
                const nextStockByAttribute = {};
                stockItems.forEach((item) => {
                    const attributeId = getScalarValue(item?.id_product_attribute) || "0";
                    nextStockByAttribute[String(attributeId)] = Number(getScalarValue(item?.quantity) || 0);
                });
                setStockByAttribute(nextStockByAttribute);

                const combinationsResponse = await getList("combinations", {
                    display: "full",
                    filters: {id_product: productId},
                    limit: "0,200",
                    signal: controller.signal,
                });
                const nextCombinations = ensureArray(
                    combinationsResponse?.data?.combinations?.combination ?? []
                );
                setCombinations(nextCombinations);

                const optionValueIds = new Set();
                nextCombinations.forEach((combination) => {
                    const values = ensureArray(
                        combination?.associations?.product_option_values?.product_option_value ?? []
                    );
                    values.forEach((value) => {
                        const valueId = getScalarValue(value?.id ?? value);
                        if (valueId) optionValueIds.add(String(valueId));
                    });
                });

                if (optionValueIds.size > 0) {
                    const optionValuesResponse = await getList("product_option_values", {
                        display: "full",
                        filters: {id: `[${[...optionValueIds].join("|")}]`},
                        limit: `0,${optionValueIds.size}`,
                        signal: controller.signal,
                    });
                    const optionValues = ensureArray(
                        optionValuesResponse?.data?.product_option_values?.product_option_value ?? []
                    );
                    const nextOptionValueMap = {};
                    const groupIds = new Set();
                    optionValues.forEach((optionValue) => {
                        const optionValueId = getScalarValue(optionValue?.id);
                        const groupId = getScalarValue(optionValue?.id_attribute_group);
                        if (optionValueId) {
                            nextOptionValueMap[String(optionValueId)] = {
                                name: getLanguageText(optionValue?.name),
                                groupId: groupId ? String(groupId) : "",
                            };
                        }
                        if (groupId) groupIds.add(String(groupId));
                    });
                    setOptionValueMap(nextOptionValueMap);

                    if (groupIds.size > 0) {
                        const groupsResponse = await getList("product_options", {
                            display: "full",
                            filters: {id: `[${[...groupIds].join("|")}]`},
                            limit: `0,${groupIds.size}`,
                            signal: controller.signal,
                        });
                        const groups = ensureArray(
                            groupsResponse?.data?.product_options?.product_option ?? []
                        );
                        const nextOptionGroupMap = {};
                        groups.forEach((group) => {
                            const groupId = getScalarValue(group?.id);
                            if (!groupId) return;
                            nextOptionGroupMap[String(groupId)] =
                                getLanguageText(group?.name) || `Option ${groupId}`;
                        });
                        setOptionGroupMap(nextOptionGroupMap);
                    }
                } else {
                    setOptionValueMap({});
                    setOptionGroupMap({});
                }

                const imageNodes = ensureArray(product?.associations?.images?.image ?? []);
                const nextImageIds = imageNodes
                    .map((image) => getScalarValue(image?.id ?? image))
                    .filter(Boolean);
                setImageIds(nextImageIds);
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
            }
        }

        loadExtras();
        return () => controller.abort();
    }, [product]);

    if (status === "loading") return <Loading>produit</Loading>;
    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Erreur produit"
                message={error?.message}
            />
        );
    }
    if (!product) {
        return <p className="text-sm text-zinc-500">Produit introuvable.</p>;
    }

    const apiBaseUrl = import.meta.env.VITE_PRESTASHOP_API_URL;
    const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY;
    const imageBaseUrl = apiBaseUrl ? String(apiBaseUrl).replace(/\/+$/, "") : "";
    const imageQuery = apiKey ? `?ws_key=${apiKey}` : "";

    const id = getScalarValue(product?.id);
    const name = getLanguageText(product?.name) || "Produit";
    const description = getLanguageText(product?.description);
    const priceHtValue = parseFloat(getScalarValue(product?.price) || 0);
    const priceHt = priceHtValue.toFixed(2);
    const taxMultiplier = 1 + (Number(taxRate) || 0) / 100;
    const priceTtcValue = priceHtValue * taxMultiplier;
    const priceTtc = priceTtcValue.toFixed(2);
    const taxAmount = (priceTtcValue - priceHtValue).toFixed(2);
    const productType = String(getScalarValue(product?.product_type || product?.type) || "");
    const hasCombinations =
        productType.toLowerCase().includes("combination") ||
        ensureArray(product?.associations?.combinations?.combination ?? []).length > 0 ||
        combinations.length > 0;

    const baseStock = stockByAttribute["0"] ?? null;

    function buildImageUrl(productId, imageId) {
        if (!imageBaseUrl || !productId || !imageId) return "";
        return `${imageBaseUrl}/images/products/${productId}/${imageId}${imageQuery}`;
    }

    function buildCombinationLabels(combination) {
        const values = ensureArray(
            combination?.associations?.product_option_values?.product_option_value ?? []
        );
        return values
            .map((value) => {
                const valueId = getScalarValue(value?.id ?? value);
                const optionValue = optionValueMap[String(valueId)];
                const groupName = optionGroupMap[optionValue?.groupId] || "Option";
                const valueName = optionValue?.name || String(valueId || "");
                return {groupName, valueName, valueId};
            })
            .filter((item) => item.valueName);
    }

    return (
        <section className="space-y-6">
            <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                Retour aux produits
            </Link>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-zinc-900">{name}</h2>
                <p className="mt-2 text-sm text-zinc-500">Ref: {getScalarValue(product?.reference) || "—"}</p>

                {imageIds.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {imageIds.map((imageId) => (
                            <img
                                key={imageId}
                                src={buildImageUrl(id, imageId)}
                                alt={name}
                                className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                                loading="lazy"
                            />
                        ))}
                    </div>
                )}

                <div className="mt-4 space-y-1">
                    <p className="text-2xl font-semibold text-emerald-600">
                        {priceTtc} Ar TTC
                    </p>
                    <p className="text-sm text-zinc-600">
                        {priceHt} Ar HT · Taxe {Number(taxRate || 0).toFixed(2)}% ({taxAmount} Ar)
                    </p>
                    {baseStock !== null && (
                        <p className="text-sm text-zinc-600">Stock disponible: {baseStock}</p>
                    )}
                </div>

                {!hasCombinations && (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-sm text-zinc-600 mr-2">Quantité</span>
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold"
                            >−</button>
                            <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                                className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm text-center"
                            />
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => q + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold"
                            >+</button>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                addItem(
                                    {
                                        lineId: `${id}:0`,
                                        id,
                                        productId: id,
                                        productAttributeId: 0,
                                        name,
                                        price: Number(priceTtc),
                                        reference: getScalarValue(product?.reference),
                                    },
                                    quantity
                                )
                            }
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Ajouter au panier
                        </button>
                    </div>
                )}

                {hasCombinations && (
                    <div className="mt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-900">Combinations</h3>
                        {combinations.length === 0 && (
                            <p className="text-sm text-zinc-500">Aucune combinaison disponible.</p>
                        )}
                        {combinations.map((combination) => {
                            const combinationId = getScalarValue(combination?.id);
                            const combinationDeltaHt =
                                parseFloat(getScalarValue(combination?.price) || 0) || 0;
                            const combinationHt = priceHtValue + combinationDeltaHt;
                            const combinationTtc = combinationHt * taxMultiplier;
                            const combinationStock =
                                stockByAttribute[String(combinationId)] ?? null;
                            const labels = buildCombinationLabels(combination);
                            const variantLabel = labels
                                .map((item) => `${item.groupName}: ${item.valueName}`)
                                .join(" · ");

                            return (
                                <div
                                    key={combinationId}
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900">
                                                {variantLabel || `Combinaison ${combinationId}`}
                                            </p>
                                            {labels.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {labels.map((label) => (
                                                        <span
                                                            key={`${label.groupName}-${label.valueId}`}
                                                            className="rounded-full bg-white px-2 py-1 text-xs text-zinc-600"
                                                        >
                                                            {label.groupName}: {label.valueName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="mt-2 text-sm text-zinc-600">
                                                {combinationHt.toFixed(2)} Ar HT · {combinationTtc.toFixed(2)} Ar TTC
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                Taxe {Number(taxRate || 0).toFixed(2)}%
                                            </p>
                                            {combinationStock !== null && (
                                                <p className="text-xs text-zinc-500">
                                                    Stock: {combinationStock}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-zinc-600 mr-1">Qté</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCombinationQty(combinationId, getCombinationQty(combinationId) - 1)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold"
                                                >−</button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={getCombinationQty(combinationId)}
                                                    onChange={(e) => setCombinationQty(combinationId, e.target.value)}
                                                    className="w-12 rounded border border-zinc-300 px-1 py-1 text-sm text-center"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setCombinationQty(combinationId, getCombinationQty(combinationId) + 1)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 text-base font-bold"
                                                >+</button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addItem(
                                                        {
                                                            lineId: `${id}:${combinationId}`,
                                                            id,
                                                            productId: id,
                                                            productAttributeId: combinationId,
                                                            name,
                                                            price: Number(combinationTtc.toFixed(2)),
                                                            reference: getScalarValue(product?.reference),
                                                            variantLabel,
                                                        },
                                                        getCombinationQty(combinationId)
                                                    )
                                                }
                                                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                            >
                                                Ajouter au panier
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {description && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-zinc-900">Description</h3>
                        <div
                            className="mt-2 text-sm text-zinc-700"
                            dangerouslySetInnerHTML={{__html: description}}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}