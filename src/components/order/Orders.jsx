import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {getList} from "../../api/prestashopCrud.js";
import {ensureArray, getScalarValue, isAbortError} from "../../utils/util-functions.js";

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];

    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

function formatMoney(value) {
    const amount = Number.parseFloat(getScalarValue(value) || "");
    return Number.isFinite(amount) ? amount.toFixed(2) : "N/A";
}

function Orders() {
    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadOrders() {
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const response = await getList("orders", {
                    display: "full",
                    limit: 50,
                    sort: "[id_ASC]",
                    signal: controller.signal,
                });

                const items = normalizeOrders(response?.data);

                if (!response?.data) {
                    setError(new Error("Invalid response format"));
                    setStatus("error");
                    return;
                }

                setOrders(items);
                setStatus("success");
                setSuccessMessage(`Loaded ${items.length} orders.`);
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadOrders();
        return () => controller.abort();
    }, []);

    if (status === "loading") return <Loading>orders</Loading>;

    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Failed to load orders"
                message={error?.message}
            />
        );
    }

    if (!orders.length) {
        return <p className="text-gray-500">No orders found.</p>;
    }

    return (
        <section className="space-y-4">
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
                    <p className="text-gray-500">Browse orders from the PrestaShop API.</p>
                </div>
                <StatusBanner variant="success" message={successMessage}/>
            </header>
            <div className="overflow-x-auto rounded border border-gray-200">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Reference
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Payment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Total paid
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            State
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Created
                        </th>
                        <th className="px-4 py-3"/>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {orders.map((order) => {
                        const id = getScalarValue(order?.id);
                        const reference = getScalarValue(order?.reference) || "N/A";
                        const customerId = getScalarValue(order?.id_customer) || "N/A";
                        const payment = getScalarValue(order?.payment) || "N/A";
                        const totalPaid = formatMoney(order?.total_paid);
                        const state = getScalarValue(order?.current_state) || "N/A";
                        const createdAt = getScalarValue(order?.date_add) || "N/A";

                        return (
                            <tr key={id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">{id}</td>
                                <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-900">{reference}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{customerId}</td>
                                <td className="max-w-[160px] truncate px-4 py-3 text-gray-800">{payment}</td>
                                <td className="px-4 py-3 font-mono text-gray-800">{totalPaid}</td>
                                <td className="px-4 py-3 text-gray-700">{state}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{createdAt}</td>
                                <td className="px-4 py-3">
                                    <Link
                                        to={`/orders/${id}`}
                                        className="inline-flex items-center rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default Orders;