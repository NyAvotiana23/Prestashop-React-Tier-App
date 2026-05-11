import {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import Modal from "../shared/Modal.jsx";
import UrlDescriptionCard from "../shared/UrlDescriptionCard.jsx";
import {getById, getList} from "../../api/prestashopCrud.js";
import {ensureArray, getScalarValue, isAbortError} from "../../utils/util-functions.js";

function formatMoney(value) {
    const amount = Number.parseFloat(getScalarValue(value) || "");
    return Number.isFinite(amount) ? amount.toFixed(2) : "N/A";
}

function normalizeOrderPayments(data) {
    if (!data || typeof data !== "object") return [];

    const ordersNode = data?.order_payments?.order_payment ?? data?.order_payments ?? data?.order_payment ?? [];
    return ensureArray(ordersNode);
}

function normalizeOrderInvoices(data) {
    if (!data || typeof data !== "object") return [];

    const ordersNode = data?.order_invoices?.order_invoice ?? data?.order_invoices ?? data?.order_invoice ?? [];
    return ensureArray(ordersNode);
}

export default function OrdersDetail() {
    const {orderId} = useParams();
    const [order, setOrder] = useState(null);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedResource, setSelectedResource] = useState(null);

    const [orderPayments, setOrderPayments] = useState([]);
    const [orderInvoices, setOrderInvoices] = useState([]);


    useEffect(() => {
        const controller = new AbortController();

        async function loadOrder() {
            if (!orderId) return;

            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const response = await getById("orders", orderId, {
                    signal: controller.signal,
                });


                const nextOrder = response?.data?.order ?? null;

                if (nextOrder) {
                    const orderReference = getScalarValue(nextOrder?.reference);
                    const orderIdValue = getScalarValue(nextOrder?.id);

                    if (orderReference) {
                        const responsePayments = await getList("order_payments",
                            {
                                display: "full",
                                filters: {order_reference: orderReference},
                                limit: 50,
                                sort: "[id_ASC]",
                                signal: controller.signal,
                            });
                        const paymentsItems = normalizeOrderPayments(responsePayments?.data);
                        setOrderPayments(paymentsItems);
                    } else {
                        setOrderPayments([]);
                    }

                    if (orderIdValue) {
                        const responseInvoices = await getList("order_invoices",
                            {
                                display: "full",
                                filters: {id_order: orderIdValue},
                                limit: 50,
                                sort: "[id_ASC]",
                                signal: controller.signal,
                            });
                        const invoicesItems = normalizeOrderInvoices(responseInvoices?.data);
                        setOrderInvoices(invoicesItems);
                    } else {
                        setOrderInvoices([]);
                    }
                } else {
                    setOrderPayments([]);
                    setOrderInvoices([]);
                }


                setOrder(nextOrder);
                setStatus("success");
                setSuccessMessage(nextOrder ? "Order loaded successfully." : "Order not found.");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadOrder();
        return () => controller.abort();
    }, [orderId]);

    const content = useMemo(() => {
        if (status === "loading") {
            return <Loading>order</Loading>;
        }

        if (status === "error") {
            return (
                <StatusBanner
                    variant="error"
                    title="Failed to load order"
                    message={error?.message}
                />
            );
        }

        if (!order) {
            return <p className="text-gray-600">Order not found.</p>;
        }

        const id = getScalarValue(order?.id);
        const reference = getScalarValue(order?.reference) || "N/A";
        const payment = getScalarValue(order?.payment) || "N/A";
        const currentState = getScalarValue(order?.current_state) || "N/A";
        const createdAt = getScalarValue(order?.date_add) || "N/A";
        const updatedAt = getScalarValue(order?.date_upd) || "N/A";
        const valid = String(getScalarValue(order?.valid)) === "1" ? "Valid" : "Invalid";

        const totalPaid = formatMoney(order?.total_paid);
        const totalProducts = formatMoney(order?.total_products);
        const totalShipping = formatMoney(order?.total_shipping);
        const totalDiscounts = formatMoney(order?.total_discounts);

        const orderRows = ensureArray(order?.associations?.order_rows?.order_row);

        return (
            <div className="space-y-6">
                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <header className="space-y-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Order {reference}</h1>
                        <p className="text-sm text-gray-500">ID: {id}</p>
                    </header>

                    <div className="mt-4 grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                        <div>
                            <p>Payment: {payment}</p>
                            <p>State: {currentState}</p>
                            <p>Valid: {valid}</p>
                            <p>Created: {createdAt}</p>
                            <p>Updated: {updatedAt}</p>
                        </div>
                        <div>
                            <p>Total paid: {totalPaid}</p>
                            <p>Total products: {totalProducts}</p>
                            <p>Total shipping: {totalShipping}</p>
                            <p>Total discounts: {totalDiscounts}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Linked resources</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_customer)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open customer: {getScalarValue(order?.id_customer)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_cart)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open cart: {getScalarValue(order?.id_cart)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_address_delivery)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open delivery address: {getScalarValue(order?.id_address_delivery)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_address_invoice)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open invoice address: {getScalarValue(order?.id_address_invoice)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_currency)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open currency: {getScalarValue(order?.id_currency)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.id_carrier)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open carrier: {getScalarValue(order?.id_carrier)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedResource(order?.current_state)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Open status: {getScalarValue(order?.current_state)}
                        </button>
                    </div>
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Order items</h2>
                    {orderRows.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">No order rows available.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unit
                                        price (tax incl.)
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                {orderRows.map((row) => {
                                    const rowId = getScalarValue(row?.id);
                                    const productName = getScalarValue(row?.product_name) || "N/A";
                                    const quantity = getScalarValue(row?.product_quantity) || "0";
                                    const unitPrice = formatMoney(row?.unit_price_tax_incl);

                                    return (
                                        <tr key={rowId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{rowId}</td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">{productName}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{quantity}</td>
                                            <td className="px-4 py-3 font-mono text-gray-800">{unitPrice}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Order payments</h2>
                    {orderPayments.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">No order payment available.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment
                                        method
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">date_add
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
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{paymentId}</td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">{paymentAmount}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{paymentMethod}</td>
                                            <td className="px-4 py-3 font-mono text-gray-800">{dateAdd}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Order invoices</h2>
                    {orderInvoices.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">No order invoices available.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded border border-gray-200">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total
                                        Paid Tax Excl
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total
                                        Paid Tax Incl
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total
                                        Shipping Tax Excl
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total
                                        Shipping Tax Incl
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date
                                        add
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                {orderInvoices.map((invoice) => {
                                    const invoiceId = getScalarValue(invoice?.id);
                                    const totalPaidTaxExcl = formatMoney(invoice?.total_paid_tax_excl);
                                    const totalPaidTaxIncl = formatMoney(invoice?.total_paid_tax_incl);
                                    const totalShippingTaxExcl = formatMoney(invoice?.total_shipping_tax_excl);
                                    const totalShippingTaxIncl = formatMoney(invoice?.total_shipping_tax_incl);
                                    const dateAdd = getScalarValue(invoice?.date_add) || "N/A";


                                    return (
                                        <tr key={invoiceId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{invoiceId}</td>
                                            <td className="max-w-[300px] truncate px-4 py-3 text-gray-800">{totalPaidTaxExcl}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{totalPaidTaxIncl}</td>
                                            <td className="px-4 py-3 font-mono text-gray-800">{totalShippingTaxExcl}</td>
                                            <td className="px-4 py-3 font-mono text-gray-800">{totalShippingTaxIncl}</td>
                                            <td className="px-4 py-3 font-mono text-gray-800">{dateAdd}</td>
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
    }, [order, status, orderPayments, orderInvoices, error]);

    return (
        <section className="space-y-6">
            <Link
                to="/admin/orders"
                className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700"
            >
                Back to orders
            </Link>
            <StatusBanner variant="success" message={successMessage}/>
            {content}
            <Modal
                isOpen={Boolean(selectedResource)}
                title="Linked resource"
                onClose={() => setSelectedResource(null)}
            >
                <UrlDescriptionCard node={selectedResource}/>
            </Modal>
        </section>
    );
}
