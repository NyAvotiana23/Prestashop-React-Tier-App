import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {
    ensureArray,
    getLanguageText,
    getScalarValue,
    isAbortError,
} from "../../utils/util-functions.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useDefaultValues} from "../../hooks/useDefaultValues.jsx";
import {HotBadge, NewBadge} from "../../utils/util-components.jsx";
import {
    buildImageUrl,
    buildTaxRateMapForProducts,
    isProductDateHot,
    isProductDateNew,
    listProducts
} from "../../service/product-service.js";




export default function FrontHome() {



    const imageBaseUrl = apiBaseUrl ? String(apiBaseUrl).replace(/\/+$/, "") : "";
    const imageQuery = apiKey ? `?ws_key=${apiKey}` : "";



    const {defaultCountry, defaultCurrency, loadingDefaultValues, defaultCategories} = useDefaultValues();
    const [products, setProducts] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [taxRatesByGroup, setTaxRatesByGroup] = useState({});
    const [filters, setFilters] = useState({});

    async function applyFilter(event) {
        event.preventDefault();

        const data = new FormData(event.target);
        const {name, categoryId, minPrice, maxPrice} = Object.fromEntries(data.entries());
        const filters = {};
        if (name) {
            filters["name"] = `%[${name.trim()}]%`;
        }
        if (categoryId) {
            filters["id_category_default"] = categoryId;

        }

        try {
            setStatus("loading");
            setError(null);

            const normalized = await listProducts({
                display: "full",
                sort: "[id_DESC]",
                params: {
                    "price[price_ttc][use_tax]": 1,
                },
                filters,
            });

            if (minPrice || maxPrice) {
                const minPriceVal = minPrice ? parseFloat(minPrice) : null;
                const maxPriceVal = maxPrice ? parseFloat(maxPrice) : null;

                const filteredByPrice = normalized.filter((p) => {
                    const price = parseFloat(getScalarValue(p?.price_ttc));
                    if (minPriceVal !== null && price < minPriceVal) return false;
                    if (maxPriceVal !== null && price > maxPriceVal) return false;
                    return true;
                });
                setProducts(filteredByPrice);

            } else {
                setProducts(normalized);
            }

            setStatus("success");
        } catch (err) {
            setError(err);
            setStatus("error");
        }

    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadProducts() {
            try {
                setStatus("loading");
                setError(null);

                const normalized = await listProducts({
                    display: "full",
                    sort: "[id_DESC]",
                    params: {
                        "price[price_ttc][use_tax]": 1,
                    },
                    signal: controller.signal,
                });

                const nextTaxRates = await buildTaxRateMapForProducts(normalized);

                setTaxRatesByGroup(nextTaxRates || {});
                setProducts(normalized);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadProducts();
        return () => controller.abort();
    }, []);

    if (status === "loading") return <Loading>produits</Loading>;
    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Erreur chargement produits"
                message={error?.message}
            />
        );
    }

    return (
        <section className="space-y-6">
            <header className="space-y-2">
                <h2 className="text-2xl font-semibold">Nouveaux produits</h2>
                <p className="text-sm text-zinc-500">Cliquez sur un produit pour voir la fiche.</p>
            </header>
            <div>
                <h2>Filter : </h2>
                <form onSubmit={applyFilter} className={"flex flex-row gap-5"}>
                    <div>
                        <label>Nom : </label>
                        <input type={"text"} name={"name"} placeholder={"Product name"}/>
                    </div>
                    <div>
                        <label>Categorie :</label>
                        <select name={"categoryId"}>
                            <option value={""}></option>
                            {defaultCategories.map((category) => <option
                                key={getScalarValue(category?.id)}
                                value={getScalarValue(category?.id)}>{getLanguageText(category?.name)}</option>)}
                        </select>
                    </div>
                    <div className={"flex flex-col gap-2"}>
                        <label>Prix Min : </label>
                        <input type={"number"} name={"minPrice"} placeholder={"Prix min"}/>
                        <label>Prix Max : </label>
                        <input type={"number"} name={"maxPrice"} placeholder={"Prix max"}/>
                    </div>

                    <button type={"submit"} className={"p-2 rounded bg-gray-200"}>
                        Appliquer les filtres
                    </button>
                </form>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                    const id = getScalarValue(product?.id);
                    const name = getLanguageText(product?.name) || "Produit";
                    const priceHtValue = parseFloat(getScalarValue(product?.price) || 0);
                    const groupId = getScalarValue(product?.id_tax_rules_group);
                    const taxRate = taxRatesByGroup[String(groupId)] ?? 0;
                    const priceTtc = (priceHtValue * (1 + (Number(taxRate) || 0) / 100)).toFixed(2);
                    const imageId = getScalarValue(product?.id_default_image);
                    return (
                        <Link
                            key={id}
                            to={`/products/${id}`}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow"
                        >
                            <div className="space-y-2">
                                {isProductDateHot(product?.available_date) && <HotBadge/>}
                                {isProductDateNew(product?.available_date) && <NewBadge/>}
                                <img
                                    src={buildImageUrl(id, imageId)}
                                    alt={name}
                                    className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                                    loading="lazy"
                                />
                                <p>New param : {getScalarValue(product?.price_ttc)}</p>
                                <h3 className="text-lg font-semibold text-zinc-900">{name}</h3>
                                <p className="text-sm text-zinc-500">Ref: {getScalarValue(product?.reference) || "—"}</p>
                                <p className={"text-sm text-zinc-500"}> Available date
                                    : {getScalarValue(product?.available_date)}</p>
                                <p className="text-lg font-semibold text-emerald-600">{priceTtc} {getLanguageText(defaultCurrency?.symbol)} TTC</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
