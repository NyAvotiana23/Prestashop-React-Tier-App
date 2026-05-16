import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {createResource, deleteResource, getList, updateResource} from "../../api/prestashopCrud.js";
import {ensureArray, formatMoney, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";

// ─── State definitions ────────────────────────────────────────────────────────

/**
 * Fake sentinel used only in the UI for carts that have no order yet.
 * It is never sent to the API as a real order state.
 */
const CART_ONLY_SENTINEL = "__cart_only__";

/**
 * Simplified 3-state selector for EXISTING orders.
 * "Dans le panier" (id=1) triggers a delete to restore the cart.
 * "Paiement accepté" (id=2) and "Annulé" (id=3) post an order_history.
 */
const ORDER_STATE_OPTIONS = [
    {id: "1", id_order_state: null, color: "#eeff00", name: "Dans le panier", template: "retour_panier"},
    {id: "2", id_order_state: "2", color: "#3498D8", name: "Paiement accepté", template: "payment"},
    {id: "3", id_order_state: "6", color: "#2C3E50", name: "Annulé", template: "order_canceled"},
];

/** Full 17-state list used only for badge display lookups. */
const ORDER_STATE_FULL_OPTIONS = [
    {id: "1", color: "#34209E", name: "En attente du paiement par chèque"},
    {id: "2", color: "#3498D8", name: "Paiement accepté"},
    {id: "3", color: "#3498D8", name: "En cours de préparation"},
    {id: "4", color: "#01B887", name: "Expédié"},
    {id: "5", color: "#01B887", name: "Livré"},
    {id: "6", color: "#2C3E50", name: "Annulé"},
    {id: "7", color: "#01B887", name: "Remboursé"},
    {id: "8", color: "#E74C3C", name: "Erreur de paiement"},
    {id: "9", color: "#3498D8", name: "En attente de réapprovisionnement (payé)"},
    {id: "10", color: "#34209E", name: "En attente de virement bancaire"},
    {id: "11", color: "#3498D8", name: "Paiement à distance accepté"},
    {id: "12", color: "#34209E", name: "En attente de réapprovisionnement (non payé)"},
    {id: "13", color: "#34209E", name: "En attente de paiement à la livraison"},
    {id: "14", color: "#34209E", name: "En attente de paiement"},
    {id: "15", color: "#01B887", name: "Remboursement partiel"},
    {id: "16", color: "#3498D8", name: "Paiement partiel"},
    {id: "17", color: "#3498D8", name: "Autorisation. A capturer par le marchand"},
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
 * sentinel + the 3 simplified states (Paiement accepté / Annulé).
 * Excludes "Dans le panier" from the actionable options — only the sentinel represents it.
 */
const CART_STATE_SELECT_OPTIONS = [
    CART_ONLY_OPTION,
    ...ORDER_STATE_OPTIONS.filter((o) => o.id !== "1"),
];

/** Badge display — full 17-state list for rich labels/colors. */
function stateOption(id) {
    return ORDER_STATE_FULL_OPTIONS.find((o) => o.id === String(id)) ?? null;
}

/** Simplified 3-option lookup for existing-order select. */
function simplifiedOption(id) {
    return ORDER_STATE_OPTIONS.find((o) => o.id === String(id)) ?? null;
}

// ─── Data-fetching helpers ────────────────────────────────────────────────────

function normalizeCarts(value) {
    return ensureArray(value?.data?.carts?.cart ?? value?.data?.carts ?? []);
}

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(node);
}

function getCartRows(cart) {
    const rows = cart?.associations?.cart_rows?.cart_row ?? cart?.associations?.cart_rows ?? [];
    return ensureArray(rows);
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
    if (!product) throw new Error(`Produit introuvable: ${productId}`);

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
            (sum, row) =>
                sum + Number(row.unit_price_tax_incl) * Number(row.product_quantity || 0),
            0
        )
        .toFixed(6);

    return {orderRows, totalPaid};
}

/**
 * Convert a cart into a real PrestaShop order, then immediately attach
 * an order_history record so the order lands in the desired state.
 */
async function createOrderFromCart(cart, targetStateId) {
    const cartId = getScalarValue(cart?.id);

    const addressDelivery =
        getScalarValue(cart?.id_address_delivery) ||
        (await getCustomerAddressId(getScalarValue(cart?.id_customer)));
    const addressInvoice = getScalarValue(cart?.id_address_invoice) || addressDelivery;

    if (!addressDelivery) throw new Error("Aucune adresse trouvée pour ce panier.");

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
            payment: "Paiement à la livraison",
            total_paid: totalPaid,
            total_paid_real: totalPaid,
            total_products: totalPaid,
            total_products_wt: totalPaid,
            conversion_rate: "1",
            associations: {
                order_rows: {
                    order_row: orderRows,
                },
            },
        },
    };

    const orderResponse = await createResource("orders", orderPayload);
    const orderId = getScalarValue(orderResponse?.data?.order?.id);

    if (!orderId) throw new Error("La commande a été créée mais l'ID est introuvable.");

    // Attach the desired order state via order_histories
    await createResource("order_histories", {
        order_history: {
            id_order: orderId,
            id_order_state: targetStateId,
        },
    });

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

                const [ordersResponse, cartsResponse] = await Promise.all([
                    getList("orders", {display: "full", sort: "[id_ASC]", signal: controller.signal}),
                    getList("carts", {display: "full", sort: "[id_ASC]", signal: controller.signal}),
                ]);

                const orderItems = normalizeOrders(ordersResponse?.data);
                const cartItems = normalizeCarts(cartsResponse);


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

    async function handleUpdateOrderState(orderId, nextSimpleId) {
        const option = simplifiedOption(nextSimpleId);
        const confirmed = window.confirm(
            `Changer l'état de la commande #${orderId} vers "${option?.name}" ?`
        );
        if (!confirmed) return;

        // "Dans le panier" → delete the order to restore it as a cart
        if (nextSimpleId === "1") {
            const confirmDelete = window.confirm(
                `Supprimer la commande #${orderId} pour la remettre dans le panier ?`
            );
            if (!confirmDelete) return;

            setUpdatingId(orderId);
            setUpdateError(null);
            try {
                await deleteResource("orders", orderId);
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

        // Real state → post order_history with the mapped id_order_state
        const targetStateId = option?.id_order_state;
        if (!targetStateId) return;

        setUpdatingId(orderId);
        setUpdateError(null);

        try {
            await createResource("order_histories", {
                order_history: {
                    id_order: orderId,
                    id_order_state: targetStateId,
                },
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

    // ── Render ───────────────────────────────────────────────────────────────

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

                                                {/* Select — sentinel + 2 actionable states */}
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
                                const currentState = String(getScalarValue(order?.current_state) || "1");
                                const createdAt = getScalarValue(order?.date_add) || "N/A";

                                const currentOption = stateOption(currentState);
                                // Default the pending select to whichever simplified option is closest.
                                // If the current state doesn't match any simplified id, default to "1".
                                const simplifiedDefault = simplifiedOption(currentState)?.id ?? "1";
                                const pendingSelected = pendingStates[id] ?? simplifiedDefault;
                                const isUpdating = updatingId === id;

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
                                                        borderLeftColor: simplifiedOption(pendingSelected)?.color ?? "#ccc",
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
                                                    onClick={() => handleUpdateOrderState(id, pendingSelected)}
                                                    disabled={isUpdating}
                                                    className="rounded bg-zinc-700 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {isUpdating ? "…" : "Appliquer"}
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