import {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {getById, getList} from "../../api/prestashopCrud.js";
import {
    ensureArray,
    getLanguageText,
    getScalarValue,
    isAbortError,
} from "../../utils/util-functions.js";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";

function formatMoney(value) {
    const amount = Number.parseFloat(getScalarValue(value) || "");
    return Number.isFinite(amount) ? amount.toFixed(2) : "N/A";
}

function normalizeOrderPayments(data) {
    if (!data || typeof data !== "object") return [];

    const ordersNode =
        data?.order_payments?.order_payment ??
        data?.order_payments ??
        data?.order_payment ??
        [];
    return ensureArray(ordersNode);
}

function normalizeOrderInvoices(data) {
    if (!data || typeof data !== "object") return [];

    const ordersNode =
        data?.order_invoices?.order_invoice ??
        data?.order_invoices ??
        data?.order_invoice ??
        [];
    return ensureArray(ordersNode);
}

export default function FrontOrderDetail() {
    const {orderId} = useParams();
    const {customerUser} = useCustomerUser();
    const [order, setOrder] = useState(null);
    const [orderPayments, setOrderPayments] = useState([]);
    const [orderInvoices, setOrderInvoices] = useState([]);
    const [orderStates, setOrderStates] = useState({});
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadOrder() {
            if (!orderId || !customerUser?.id) return;

            try {
                setStatus("loading");
                setError(null);

                const response = await getById("orders", orderId, {
                    signal: controller.signal,
                });

                const nextOrder = response?.data?.order ?? null;

                if (!nextOrder) {
                    setOrder(null);
                    setOrderPayments([]);
                    setOrderInvoices([]);
                    setOrderStates({});
                    setStatus("success");
                    return;
                }

                const customerId = getScalarValue(nextOrder?.id_customer);
                if (String(customerId) !== String(customerUser.id)) {
                    setOrder(null);
                    setOrderPayments([]);
                    setOrderInvoices([]);
                    setOrderStates({});
                    setStatus("success");
                    return;
                }

                const orderReference = getScalarValue(nextOrder?.reference);
                const orderIdValue = getScalarValue(nextOrder?.id);

                const [paymentsResponse, invoicesResponse, statesResponse] =
                    await Promise.all([
                        orderReference
                            ? getList("order_payments", {
                                display: "full",
                                filters: {order_reference: orderReference},
                                limit: 50,
                                sort: "[id_ASC]",
                                signal: controller.signal,
                            })
                            : Promise.resolve(null),
                        orderIdValue
                            ? getList("order_invoices", {
                                display: "full",
                                filters: {id_order: orderIdValue},
                                limit: 50,
                                sort: "[id_ASC]",
                                signal: controller.signal,
                            })
                            : Promise.resolve(null),
                        getList("order_states", {
                            display: "full",
                            limit: "0,100",
                            signal: controller.signal,
                        }),
                    ]);

                const paymentsItems = normalizeOrderPayments(paymentsResponse?.data);
                const invoicesItems = normalizeOrderInvoices(invoicesResponse?.data);
                const stateItems = ensureArray(
                    statesResponse?.data?.order_states?.order_state ?? []
                );

                const nextStateMap = stateItems.reduce((acc, state) => {
                    const id = getScalarValue(state?.id);
                    const name = getLanguageText(state?.name);
                    if (id) acc[id] = name || "Etat";
                    return acc;
                }, {});

                setOrderPayments(paymentsItems);
                setOrderInvoices(invoicesItems);
                setOrderStates(nextStateMap);
                setOrder(nextOrder);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadOrder();
        return () => controller.abort();
    }, [orderId, customerUser]);

    const content = useMemo(() => {
        if (status === "loading") {
            return <Loading>commande</Loading>;
        }

        if (status === "error") {
            return (
                <StatusBanner
                    variant="error"
                    title="Erreur chargement commande"
                    message={error?.message}
                />
            );
        }

        if (!order) {
            return <p className="text-gray-600">Commande introuvable.</p>;
        }

        const id = getScalarValue(order?.id);
        const reference = getScalarValue(order?.reference) || "N/A";
        const payment = getScalarValue(order?.payment) || "N/A";
        const currentStateId = getScalarValue(order?.current_state) || "N/A";
        const currentStateName =
            orderStates[currentStateId] || currentStateId || "N/A";
        const createdAt = getScalarValue(order?.date_add) || "N/A";
        const updatedAt = getScalarValue(order?.date_upd) || "N/A";
        const valid =
            String(getScalarValue(order?.valid)) === "1" ? "Valide" : "Invalide";

        const totalPaid = formatMoney(order?.total_paid);
        const totalProducts = formatMoney(order?.total_products);
        const totalShipping = formatMoney(order?.total_shipping);
        const totalDiscounts = formatMoney(order?.total_discounts);

        const orderRows = ensureArray(order?.associations?.order_rows?.order_row);

        return (
            <div className="space-y-6">
                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <header className="space-y-2">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Commande {reference}
                        </h1>
                        <p className="text-sm text-gray-500">ID: {id}</p>
                    </header>

                    <div className="mt-4 grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                        <div>
                            <p>Paiement: {payment}</p>
                            <p>Etat: {currentStateName}</p>
                            <p>Valide: {valid}</p>
                            <p>Cree: {createdAt}</p>
                            <p>Mis a jour: {updatedAt}</p>
                        </div>
                        <div>
                            <p>Total paye: {totalPaid}</p>
                            <p>Total produits: {totalProducts}</p>
                            <p>Total livraison: {totalShipping}</p>
                            <p>Total remises: {totalDiscounts}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Articles de la commande
                    </h2>
                    {orderRows.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">
                            Aucun article disponible.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Produit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Quantite
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Prix unitaire (TTC)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Total  (TTC)
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                {orderRows.map((row) => {
                                    const rowId = getScalarValue(row?.id);
                                    const productName =
                                        getScalarValue(row?.product_name) || "N/A";
                                    const quantity = getScalarValue(row?.product_quantity) || "0";
                                    const unitPrice = formatMoney(row?.unit_price_tax_incl);

                                    const total = formatMoney(parseFloat(quantity) * parseFloat(unitPrice));

                                    return (
                                        <tr key={rowId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                {rowId}
                                            </td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">
                                                {productName}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {quantity}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {unitPrice}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {total}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Paiements de la commande
                    </h2>
                    {orderPayments.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">
                            Aucun paiement disponible.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Montant
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Methode de paiement
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Date
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                {orderPayments.map((payment) => {
                                    const paymentId = getScalarValue(payment?.id);
                                    const paymentAmount = formatMoney(payment?.amount);
                                    const paymentMethod = getScalarValue(payment?.payment_method);
                                    const dateAdd = getScalarValue(payment?.date_add);

                                    return (
                                        <tr key={paymentId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                {paymentId}
                                            </td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">
                                                {paymentAmount}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {paymentMethod}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {dateAdd}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Factures</h2>
                    {orderInvoices.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">
                            Aucune facture disponible.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Total TTC HT
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Total TTC
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Livraison HT
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Livraison TTC
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Date
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                {orderInvoices.map((invoice) => {
                                    const invoiceId = getScalarValue(invoice?.id);
                                    const totalPaidTaxExcl = formatMoney(
                                        invoice?.total_paid_tax_excl
                                    );
                                    const totalPaidTaxIncl = formatMoney(
                                        invoice?.total_paid_tax_incl
                                    );
                                    const totalShippingTaxExcl = formatMoney(
                                        invoice?.total_shipping_tax_excl
                                    );
                                    const totalShippingTaxIncl = formatMoney(
                                        invoice?.total_shipping_tax_incl
                                    );
                                    const dateAdd = getScalarValue(invoice?.date_add) || "N/A";

                                    return (
                                        <tr key={invoiceId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                                {invoiceId}
                                            </td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">
                                                {totalPaidTaxExcl}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {totalPaidTaxIncl}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {totalShippingTaxExcl}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {totalShippingTaxIncl}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-800">
                                                {dateAdd}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [order, status, orderPayments, orderInvoices, orderStates, error]);

    return (
        <section className="space-y-6">
            <Link
                to="/orders"
                className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700"
            >
                Retour aux commandes
            </Link>
            {content}
        </section>
    );
}

