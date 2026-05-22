import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {formatMoney, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import {ORDER_STATE_FULL_OPTIONS} from "../../constants/order-states.js";
import {updateOrderState} from "../../service/custom-stock-service.js";
import {getCustomerAddressId} from "../../service/customer-service.js";
import {getCartRows,  listCarts} from "../../service/cart-service.js";
import {
    buildOrderPayloadFromCart,
    buildOrderRowsFromCart,
    createOrder,
    deleteOrderById,
    listOrders,
} from "../../service/order-service.js";
import {getFirstResourceId} from "../../service/common-service.js";

// ─── State definitions ────────────────────────────────────────────────────────

/**
 * Fake sentinel used only in the UI for carts that have no order yet.
 * It is never sent to the API as a real order state.
 */
const CART_ONLY_SENTINEL = "__cart_only__";
const STATE_PAYMENT_ACCEPTED = "11";
const STATE_DELIVERED = "5";
const STATE_CANCELED = "6";

/**
 * Managed states for existing orders.
 * "Dans le panier" is virtual and deletes the order to restore the cart.
 */
const ORDER_STATE_OPTIONS = [
     {id: CART_ONLY_SENTINEL, id_order_state: null, color: "#eeff00", name: "Dans le panier", template: "retour_panier"},
     {id: STATE_PAYMENT_ACCEPTED, id_order_state: STATE_PAYMENT_ACCEPTED, color: "#3498D8", name: "Paiement accepté", template: "payment"},
     {id: STATE_DELIVERED, id_order_state: STATE_DELIVERED, color: "#01B887", name: "Livré", template: "delivered"},
     {id: STATE_CANCELED, id_order_state: STATE_CANCELED, color: "#2C3E50", name: "Annulé", template: "order_canceled"},
 ];

/** Virtual state shown in the select for cart-only rows. */
const CART_ONLY_OPTION = {
    id: CART_ONLY_SENTINEL,
    color: "#eeff00",
    name: "Dans le panier",
    template: "retour_panier",
};

/**
 * Options shown in the select for cart-only rows:
 * sentinel + the 3 actionable states (Paiement accepté / Livré / Annulé).
 * Excludes "Dans le panier" from the actionable options — only the sentinel represents it.
 */
const CART_STATE_SELECT_OPTIONS = [
    CART_ONLY_OPTION,
    ...ORDER_STATE_OPTIONS.filter((o) => o.id !== CART_ONLY_SENTINEL),
];

/** Badge display — full 17-state list for rich labels/colors. */
function stateOption(id) {
    return ORDER_STATE_FULL_OPTIONS.find((o) => o.id === String(id)) ?? null;
}

/** Managed option lookup for existing-order select. */
function managedOption(id) {
    return ORDER_STATE_OPTIONS.find((o) => o.id === String(id)) ?? null;
}

function getTransitionError(currentState, nextState) {
    const normalizedCurrent = String(currentState);
    const normalizedNext = String(nextState);

    if (normalizedNext === normalizedCurrent) return null;

    if (normalizedCurrent !== STATE_PAYMENT_ACCEPTED) {
        return "Seules les commandes en paiement accepté (11) peuvent changer d'état.";
    }

    if (
        normalizedNext === CART_ONLY_SENTINEL ||
        normalizedNext === STATE_DELIVERED ||
        normalizedNext === STATE_CANCELED
    ) {
        return null;
    }
    alert("État cible non géré.")
    return "État cible non géré.";
}

/**
 * Convert a cart into a real PrestaShop order, then immediately attach
 * a custom state update when needed (livre/annule).
  */
async function createOrderFromCart(cart, targetStateId) {
    const cartId = getScalarValue(cart?.id);

    const addressDelivery =
        getScalarValue(cart?.id_address_delivery) ||
        (await getCustomerAddressId(getScalarValue(cart?.id_customer)));
    const addressInvoice = getScalarValue(cart?.id_address_invoice) || addressDelivery;

    if (!addressDelivery) throw new Error("Aucune adresse trouvée pour ce panier.");

    const currencyId = getScalarValue(cart?.id_currency) || (await getFirstResourceId("currencies")) || "1";
    const carrierId = getScalarValue(cart?.id_carrier) || (await getFirstResourceId("carriers")) || "1";
    const langId = getScalarValue(cart?.id_lang) || "1";
    const customerId = getScalarValue(cart?.id_customer);

    const {orderRows, totalPaid} = await buildOrderRowsFromCart(cart);

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

    if (!orderId) throw new Error("La commande a été créée mais l'ID est introuvable.");

    if (String(targetStateId) === STATE_DELIVERED || String(targetStateId) === STATE_CANCELED) {
        await updateOrderState({
            orderId,
            stateId: Number(targetStateId),
            effectiveDate: new Date(),
        });
    }

    return orderId;
}

// ─── Tiny sub-components ──────────────────────────────────────────────────────

function StateBadge({stateId, fallback}) {
    const opt = stateOption(stateId);
    return (
        <span
            className="rounded px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap"
            style={{backgroundColor: opt?.color ?? "#999"}}
        >
            {opt?.name ?? fallback ?? stateId}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function Orders() {
    const [orders, setOrders] = useState([]);
    const [cartOnly, setCartOnly] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [updatingId, setUpdatingId] = useState(null);   // orderId or `cart-${cartId}`
    const [updateError, setUpdateError] = useState(null);
    const [pendingStates, setPendingStates] = useState({}); // keyed by row-key
    const [statistics, setStatistics] = useState({
        totalCart: 0,
        totalCartOnly: 0,
        totalOrders: 0,
    })
    // ── Load orders + carts ──────────────────────────────────────────────────

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const [orderItems, cartItems] = await Promise.all([
                    listOrders({display: "full", sort: "[id_ASC]", signal: controller.signal}),
                    listCarts({display: "full", sort: "[id_ASC]", signal: controller.signal}),
                ]);


                // Build the set of cart IDs that already have an order
                const cartIdsWithOrder = new Set(
                    orderItems.map((o) => String(getScalarValue(o?.id_cart))).filter(Boolean)
                );

                const cartOnlyItems = cartItems.filter(
                    (c) => !cartIdsWithOrder.has(String(getScalarValue(c?.id)))
                );
                setStatistics({
                    totalCart: cartItems.length,
                    totalCartOnly: cartOnlyItems.length,
                    totalOrders: orderItems.length,
                });
                setOrders(orderItems);
                setCartOnly(cartOnlyItems);


                setStatus("success");
                setSuccessMessage(`${orderItems.length} commande(s) chargée(s).`);
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        load();
        return () => controller.abort();
    }, []);

    // ── Update state for an existing order (3 simplified options) ────────────

    async function handleUpdateOrderState(orderId, currentState, nextStateId) {
        const option = managedOption(nextStateId);
        const confirmed = window.confirm(
            `Changer l'état de la commande #${orderId} vers "${option?.name}" ?`
        );
        if (!confirmed) return;

        if (String(nextStateId) === String(currentState)) {
            setSuccessMessage("Aucun changement d'état.");
            return;
        }

        const transitionError = getTransitionError(currentState, nextStateId);
        if (transitionError) {
            setUpdateError(new Error(transitionError));
            return;
        }

        // "Dans le panier" → delete the order to restore it as a cart
        if (nextStateId === CART_ONLY_SENTINEL) {
            const confirmDelete = window.confirm(
                `Supprimer la commande #${orderId} pour la remettre dans le panier ?`
            );
            if (!confirmDelete) return;

            setUpdatingId(orderId);
            setUpdateError(null);
            try {
                await deleteOrderById(orderId);
                setOrders((prev) => prev.filter((o) => getScalarValue(o?.id) !== orderId));
                setSuccessMessage(`Commande #${orderId} supprimée — panier restauré.`);
            } catch (err) {
                setUpdateError(err);
            } finally {
                setUpdatingId(null);
                window.location.reload();
            }
            return;
        }

        // Real state → custom endpoint for livre/annule
        const targetStateId = option?.id_order_state;
        if (!targetStateId) return;

        setUpdatingId(orderId);
        setUpdateError(null);

        try {
            await updateOrderState({
                orderId,
                stateId: Number(targetStateId),
                effectiveDate: new Date(),
            });

            setOrders((prev) =>
                prev.map((o) =>
                    getScalarValue(o?.id) === orderId
                        ? {...o, current_state: {value: targetStateId}}
                        : o
                )
            );

            setPendingStates((prev) => {
                const next = {...prev};
                delete next[orderId];
                return next;
            });

            setSuccessMessage("État de la commande mis à jour.");
        } catch (err) {
            setUpdateError(err);
        } finally {
            setUpdatingId(null);
            // Pas recommendé
            window.location.reload();
        }
    }

    // ── Convert a cart-only row into a real order ────────────────────────────

    async function handleCartStateChange(cart, selectedOptionId) {
        const cartId = getScalarValue(cart?.id);
        const rowKey = `cart-${cartId}`;
        const option = ORDER_STATE_OPTIONS.find((o) => o.id === selectedOptionId);

        if (!option) return; // "Dans le panier" selected → nothing to do

        const confirmed = window.confirm(
            `Créer une commande pour le panier #${cartId} avec l'état "${option.name}" ?`
        );
        if (!confirmed) {
            // Reset select back to the sentinel
            setPendingStates((prev) => ({...prev, [rowKey]: CART_ONLY_SENTINEL}));
            return;
        }

        setUpdatingId(rowKey);
        setUpdateError(null);

        try {
            const orderId = await createOrderFromCart(cart, selectedOptionId);

            // Move this cart out of cartOnly and into orders list
            setCartOnly((prev) => prev.filter((c) => getScalarValue(c?.id) !== cartId));
            setOrders((prev) => [
                ...prev,
                {
                    // Minimal synthetic order object so it renders immediately;
                    // a page refresh will load the full data from the API.
                    id: {value: orderId},
                    id_cart: {value: cartId},
                    id_customer: cart?.id_customer,
                    payment: {value: "Paiement à la livraison"},
                    total_paid: {value: "—"},
                    current_state: {value: selectedOptionId},
                    date_add: {value: new Date().toISOString().slice(0, 19)},
                    reference: {value: "—"},
                },
            ]);

            setPendingStates((prev) => {
                const next = {...prev};
                delete next[rowKey];
                return next;
            });

            setSuccessMessage(`Commande #${orderId} créée avec succès.`);
        } catch (err) {
            setUpdateError(err);
            // Reset select back to sentinel so user can retry
            setPendingStates((prev) => ({...prev, [rowKey]: CART_ONLY_SENTINEL}));
        } finally {
            setUpdatingId(null);
        }
    }

    // ── Render ────────────────────────────────���──────────────────────────────

    if (status === "loading") return <Loading>orders</Loading>;

    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Échec du chargement"
                message={error?.message}
            />
        );
    }

    const hasRows = orders.length > 0 || cartOnly.length > 0;

    return (
        <section className="space-y-6">
            {/* ── Header ── */}
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Commandes</h1>
                    <p className="text-gray-500">
                        {orders.length} commande(s) · {cartOnly.length} panier(s) sans commande
                    </p>
                </div>
                <StatusBanner variant="success" message={successMessage}/>
                {updateError && (
                    <StatusBanner
                        variant="error"
                        title="Échec mise à jour"
                        message={updateError?.message}
                    />
                )}
            </header>

            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Statistiques</h2>
                {statistics && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total orders</p>
                            <p className="text-2xl font-bold text-gray-800">{statistics.totalOrders}</p>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total carts</p>
                            <p className="text-2xl font-bold text-blue-700">{statistics.totalCart}</p>
                        </div>

                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total cart only</p>
                            <p className="text-2xl font-bold text-green-700">{statistics.totalCartOnly}</p>
                        </div>
                    </div>
                )}
            </div>
            {!hasRows && <p className="text-gray-500">Aucune commande ni panier trouvé.</p>}

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 1 — Carts without orders (top)
            ════════════════════════════════════════════════════════════════ */}
            {cartOnly.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                        Paniers sans commande ({cartOnly.length})
                    </h2>
                    <div className="overflow-x-auto rounded border border-amber-200">
                        <table className="w-full min-w-[960px] border-collapse text-sm">
                            <thead className="bg-amber-50">
                            <tr>
                                {["Panier ID", "Client", "Lignes", "Montant estimé", "Créé le", "État / Action", ""].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-amber-700"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50 bg-white">
                            {cartOnly.map((cart) => {
                                const cartId = getScalarValue(cart?.id);
                                const rowKey = `cart-${cartId}`;
                                const customer = getScalarValue(cart?.id_customer) || "N/A";
                                const dateAdd = getScalarValue(cart?.date_add) || "—";
                                const rows = getCartRows(cart);
                                const isUpdating = updatingId === rowKey;
                                const pendingSelected = pendingStates[rowKey] ?? CART_ONLY_SENTINEL;
                                const pendingOpt =
                                    CART_STATE_SELECT_OPTIONS.find((o) => o.id === pendingSelected)
                                    ?? CART_ONLY_OPTION;

                                const lineCount = rows.length;

                                return (
                                    <tr key={cartId} className="hover:bg-amber-50/40">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                            #{cartId}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{customer}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{lineCount} ligne(s)</td>
                                        <td className="px-4 py-3 text-xs text-gray-400 italic">—</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{dateAdd}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Current virtual badge */}
                                                <span
                                                    className="rounded px-2 py-0.5 text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: CART_ONLY_OPTION.color,
                                                        color: "#333",
                                                    }}
                                                >
                                                    Dans le panier
                                                </span>

                                                {/* Select — sentinel + 3 actionable states */}
                                                <select
                                                    value={pendingSelected}
                                                    onChange={(e) =>
                                                        setPendingStates((prev) => ({
                                                            ...prev,
                                                            [rowKey]: e.target.value,
                                                        }))
                                                    }
                                                    disabled={isUpdating}
                                                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                                                    style={{
                                                        borderLeftColor: pendingOpt?.color ?? "#ccc",
                                                        borderLeftWidth: 3,
                                                    }}
                                                >
                                                    {CART_STATE_SELECT_OPTIONS.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>
                                                            {opt.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Apply — only active when a real state is chosen */}
                                                <button
                                                    onClick={() => handleCartStateChange(cart, pendingSelected)}
                                                    disabled={
                                                        isUpdating ||
                                                        pendingSelected === CART_ONLY_SENTINEL
                                                    }
                                                    className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {isUpdating ? "…" : "Créer commande"}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 italic">
                                            Pas encore de commande
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 2 — Real orders (below)
            ════════════════════════════════════════════════════════════════ */}
            {orders.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                        Commandes ({orders.length})
                    </h2>
                    <div className="overflow-x-auto rounded border border-gray-200">
                        <table className="w-full min-w-[960px] border-collapse text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                {["ID", "Référence", "Client", "Paiement", "Total TTC", "État", "Créé le", ""].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                            {orders.map((order) => {
                                const id = getScalarValue(order?.id);
                                const reference = getScalarValue(order?.reference) || "N/A";
                                const customerId = getScalarValue(order?.id_customer) || "N/A";
                                const payment = getScalarValue(order?.payment) || "N/A";
                                const totalPaid = formatMoney(order?.total_paid);
                                const currentState = String(getScalarValue(order?.current_state) || STATE_PAYMENT_ACCEPTED);
                                const createdAt = getScalarValue(order?.date_add) || "N/A";

                                const managedDefault = managedOption(currentState)?.id ?? STATE_PAYMENT_ACCEPTED;
                                const pendingSelected = pendingStates[id] ?? managedDefault;
                                const isUpdating = updatingId === id;
                                const canQuickChange = currentState === STATE_PAYMENT_ACCEPTED;

                                return (
                                    <tr key={id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{id}</td>
                                        <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-900">{reference}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{customerId}</td>
                                        <td className="max-w-[160px] truncate px-4 py-3 text-gray-800">{payment}</td>
                                        <td className="px-4 py-3 font-mono text-gray-800">{totalPaid}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Current state badge — uses full 17-state colours */}
                                                <StateBadge stateId={currentState} fallback={currentState}/>

                                                {/* State selector — 3 simplified options */}
                                                <select
                                                    value={pendingSelected}
                                                    onChange={(e) =>
                                                        setPendingStates((prev) => ({...prev, [id]: e.target.value}))
                                                    }
                                                    disabled={isUpdating}
                                                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                                                    style={{
                                                        borderLeftColor: managedOption(pendingSelected)?.color ?? "#ccc",
                                                        borderLeftWidth: 3,
                                                    }}
                                                >
                                                    {ORDER_STATE_OPTIONS.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>
                                                            {opt.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    onClick={() => handleUpdateOrderState(id, currentState, pendingSelected)}
                                                    disabled={isUpdating}
                                                    className="rounded bg-zinc-700 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {isUpdating ? "…" : "Appliquer"}
                                                </button>

                                                <button
                                                    onClick={() => handleUpdateOrderState(id, currentState, STATE_DELIVERED)}
                                                    disabled={isUpdating || !canQuickChange}
                                                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Livré
                                                </button>

                                                <button
                                                    onClick={() => handleUpdateOrderState(id, currentState, STATE_CANCELED)}
                                                    disabled={isUpdating || !canQuickChange}
                                                    className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Annulé
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{createdAt}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`${id}`}
                                                className="inline-flex items-center rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                                            >
                                                Voir
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Orders;