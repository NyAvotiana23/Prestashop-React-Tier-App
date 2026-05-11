import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {getById} from "../../api/prestashopCrud.js";
import {getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCart} from "../../hooks/useCart.jsx";

export default function FrontProductDetail() {
    const {productId} = useParams();
    const {addItem} = useCart();
    const [product, setProduct] = useState(null);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);

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

    const id = getScalarValue(product?.id);
    const name = getLanguageText(product?.name) || "Produit";
    const description = getLanguageText(product?.description);
    const price = parseFloat(getScalarValue(product?.price) || 0).toFixed(2);

    return (
        <section className="space-y-6">
            <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                Retour aux produits
            </Link>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-zinc-900">{name}</h2>
                <p className="mt-2 text-sm text-zinc-500">Ref: {getScalarValue(product?.reference) || "—"}</p>
                <p className="mt-4 text-2xl font-semibold text-emerald-600">{price} Ar</p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-zinc-600">
                        Quantite
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(event) => setQuantity(Number(event.target.value))}
                            className="ml-2 w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() =>
                            addItem(
                                {
                                    id,
                                    name,
                                    price: Number(price),
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

