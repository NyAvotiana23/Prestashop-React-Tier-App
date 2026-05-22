import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {getScalarValue, isAbortError} from "../../utils/util-functions.js";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {getCartRows, listCustomerCarts} from "../../service/cart-service.js";
import {getCustomerAddressId} from "../../service/customer-service.js";
import {buildOrderPayloadFromCart, buildOrderRowsFromCart, createOrder, findOrderByCartId} from "../../service/order-service.js";
import {DEFAULT_CARRIER_ID, DEFAULT_CURRENCY_ID, DEFAULT_LANG_ID} from "../../service/default-values-service.js";

function FrontCartHistory() {

    const currencyId = DEFAULT_CURRENCY_ID;
    const carrierId = DEFAULT_CARRIER_ID;
    const langId = DEFAULT_LANG_ID;


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

                const carts = await listCustomerCarts(customerUser.id, {
                    signal: controller.signal,
                });
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


            const customerId = getScalarValue(cart?.id_customer);

            const {orderRows, totalPaid, enrichedRows} = await buildOrderRowsFromCart(cart);
            const orderPayload = buildOrderPayloadFromCart({
                cartId,
                addressId: addressDelivery,
                currencyId,
                langId,
                customerId,
                carrierId,
                totalPaid,
            });

            const orderId = await createOrder(orderPayload);

            // Record a stock decrement movement for each ordered line
            // const dateAdd = getDateTimeString();
            // for (const row of enrichedRows) {
            //     try {
            //         await recordStockMovementForOrderRow({
            //             productId: row._productId,
            //             combinationId: row._combinationId,
            //             orderId: orderId || "0",
            //             quantity: row._quantity,
            //             priceHt: row._priceHt,
            //             dateAdd,
            //         });
            //     } catch (err) {
            //         console.error(
            //             `Stock movement failed for product ${row._productId} / combo ${row._combinationId}:`,
            //             err
            //         );
            //     }
            // }

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