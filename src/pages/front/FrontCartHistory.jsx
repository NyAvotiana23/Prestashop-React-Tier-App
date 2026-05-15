import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {createResource, getList} from "../../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";

function normalizeCarts(value) {
    return ensureArray(value?.data?.carts?.cart ?? value?.data?.carts ?? []);
}

async function getFirstId(ref, filters) {
    const response = await getList(ref, {
        display: "[id]",
        limit: "0,1",
        filters,
    });
    const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
    const items = ensureArray(node);
    const first = items[0];
    return getScalarValue(first?.id || first?.["@_id"]);
}

async function getCustomerAddressId(customerId) {
    const response = await getList("addresses", {
        display: "[id]",
        filters: {id_customer: customerId},
        limit: "0,1",
    });
    const items = ensureArray(response?.data?.addresses?.address ?? []);
    return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}

async function getTaxRateForGroup(taxRulesGroupId) {
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

async function getProductPricing(productId, combinationId) {
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
    return {priceHt: effectiveHt, priceTtc, product};
}

function getCartRows(cart) {
    const rows = cart?.associations?.cart_rows?.cart_row ?? cart?.associations?.cart_rows ?? [];
    return ensureArray(rows);
}

async function findOrderByCartId(cartId) {
    const response = await getList("orders", {
        display: "[id,reference]",
        filters: {id_cart: cartId},
        limit: "0,1",
    });
    const items = ensureArray(response?.data?.orders?.order ?? response?.data?.orders ?? []);
    const first = items[0];
    if (!first) return null;
    return {
        id: getScalarValue(first?.id || first?.["@_id"]),
        reference: getScalarValue(first?.reference),
    };
}

function FrontCartHistory() {
    const {customerUser} = useCustomerUser();
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [customerCarts, setCustomerCarts] = useState([]);
    const [activeCartId, setActiveCartId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const controller = new AbortController();

        async function loadCustomerCarts() {
            if (!customerUser?.id) return;
            try {
                setStatus("loading");
                setError(null);

                const cartsResponse = await getList("carts", {
                    display: "full",
                    filters: {
                        id_customer: customerUser.id,
                    },
                    sort: "[date_add_DESC]",
                    params: {
                        date: 1,
                    },
                    signal: controller.signal,
                });

                const carts = normalizeCarts(cartsResponse);
                setCustomerCarts(carts);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setStatus("error");
                setError(err?.message ?? "Impossible de charger les paniers.");
            }
        }

        loadCustomerCarts();
        return () => controller.abort();
    }, [customerUser]);

    async function buildOrderRowsFromCart(cart) {
        const cartRows = getCartRows(cart);
        const orderRows = await Promise.all(
            cartRows.map(async (row) => {
                const productId = getScalarValue(row?.id_product);
                const combinationId = getScalarValue(row?.id_product_attribute) || "0";
                const quantity = Number(getScalarValue(row?.quantity) ?? 1);

                const pricing = await getProductPricing(productId, combinationId);
                const name = getLanguageText(pricing.product?.name) || `Produit ${productId}`;
                const reference = getScalarValue(pricing.product?.reference) || "";

                return {
                    product_id: productId,
                    product_attribute_id: combinationId,
                    product_quantity: quantity,
                    product_name: name,
                    product_reference: reference,
                    product_price: pricing.priceTtc.toFixed(6),
                    unit_price_tax_incl: pricing.priceTtc.toFixed(6),
                    unit_price_tax_excl: pricing.priceHt.toFixed(6),
                };
            })
        );

        const totalPaid = orderRows
            .reduce(
                (sum, row) => sum + Number(row.unit_price_tax_incl) * Number(row.product_quantity || 0),
                0
            )
            .toFixed(6);

        return {orderRows, totalPaid};
    }

    async function handleValidateCart(cart) {
        const cartId = getScalarValue(cart?.id);
        if (!cartId) return;

        setActiveCartId(cartId);
        setStatus("loading");
        setError(null);
        setSuccess(null);

        try {
            const existingOrder = await findOrderByCartId(cartId);
            if (existingOrder?.id) {
                const confirmOpen = window.confirm(
                    `Une commande existe deja pour le panier ${cartId}. Ouvrir la commande ?`
                );
                if (confirmOpen) {
                    navigate(`/orders/${existingOrder.id}`);
                }
                return;
            }

            const confirmCreate = window.confirm(
                `Aucune commande pour le panier ${cartId}. Voulez-vous la creer ?`
            );
            if (!confirmCreate) return;

            const addressDelivery = getScalarValue(cart?.id_address_delivery)
                || (await getCustomerAddressId(cart?.id_customer));
            const addressInvoice = getScalarValue(cart?.id_address_invoice) || addressDelivery;
            if (!addressDelivery) {
                throw new Error("Aucune adresse trouvee pour ce panier.");
            }

            const currencyId = getScalarValue(cart?.id_currency) || (await getFirstId("currencies")) || "1";
            const carrierId = getScalarValue(cart?.id_carrier) || (await getFirstId("carriers")) || "1";
            const langId = getScalarValue(cart?.id_lang) || "1";
            const customerId = getScalarValue(cart?.id_customer);

            const {orderRows, totalPaid} = await buildOrderRowsFromCart(cart);

            const orderPayload = {
                order: {
                    id_address_delivery: addressDelivery,
                    id_address_invoice: addressInvoice,
                    id_cart: cartId,
                    id_currency: currencyId,
                    id_lang: langId,
                    id_customer: customerId,
                    id_carrier: carrierId,
                    module: "ps_cashondelivery",
                    payment: "Paiement a la livraison",
                    total_paid: totalPaid,
                    total_paid_real: totalPaid,
                    total_products: totalPaid,
                    total_products_wt: totalPaid,
                    conversion_rate: "1",
                    // associations: {
                    //     order_rows: {
                    //         order_row: orderRows,
                    //     },
                    // },
                },
            };

            const orderResponse = await createResource("orders", orderPayload);
            const orderId = getScalarValue(orderResponse?.data?.order?.id);

            setSuccess(`Commande creee (ID: ${orderId || "?"}).`);
            setStatus("success");
            if (orderId) {
                navigate(`/orders/${orderId}`);
            }
        } catch (err) {
            setError(err?.message ?? "Impossible de creer la commande.");
            setStatus("error");
        } finally {
            setActiveCartId(null);
        }
    }

    if (status === "loading" && !customerCarts.length) {
        return <p className="text-sm text-zinc-500">Chargement des paniers...</p>;
    }

    if (error && !customerCarts.length) {
        return <StatusBanner variant="error" message={error}/>;
    }

    if (!customerCarts.length) {
        return <p className="text-sm text-zinc-500">Aucun panier.</p>;
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-semibold">Historique des paniers</h2>
                <p className="text-sm text-zinc-500">Liste des paniers crees.</p>
            </header>

            {error && <StatusBanner variant="error" message={error}/>}
            {success && <StatusBanner variant="success" message={success}/>}


            <div className="space-y-4">
                {customerCarts.map((cart) => {
                    const cartId = getScalarValue(cart?.id);
                    const dateAdd = getScalarValue(cart?.date_add) || "—";
                    const shopId = getScalarValue(cart?.id_shop) || "—";
                    const rows = getCartRows(cart);
                    console.log(rows)

                    return (
                        <div key={cartId || dateAdd} className="rounded border border-zinc-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-zinc-500">Panier #{cartId}</p>
                                    <p className="text-xs text-zinc-400">Date: {dateAdd}</p>
                                    <p className="text-xs text-zinc-400">Shop: {shopId}</p>
                                    <p className="text-xs text-zinc-400">Lignes: {rows.length}</p>
                                </div>
                                <div>
                                    <p>Details</p>
                                    {rows.map((row) => <p className="text-sm text-zinc-500">Product id : {getScalarValue(row?.id_product)} Quantité : {getScalarValue(row?.quantity)}</p>)}
                                </div>
                                <button
                                    type="button"
                                    disabled={status === "loading" && activeCartId === cartId}
                                    onClick={() => handleValidateCart(cart)}
                                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {status === "loading" && activeCartId === cartId
                                        ? "Validation..."
                                        : "Valider le panier"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default FrontCartHistory;

