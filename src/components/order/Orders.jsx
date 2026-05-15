import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {createResource, getList, updateResource} from "../../api/prestashopCrud.js";
import {ensureArray, formatMoney, getScalarValue, isAbortError} from "../../utils/util-functions.js";

const ORDER_STATE_OPTIONS = [
    {id: "2", color: "#3498D8", name: "Paiement accepté", template: "payment"},
    {id: "6", color: "#2C3E50", name: "Annulé", template: "order_canceled"},
    {id: "8", color: "#E74C3C", name: "Erreur de paiement", template: "payment_error"},
];

const ORDER_STATE_FULL_OPTIONS = [
    {id: "1", color: "#34209E", name: "En attente du paiement par chèque", template: "cheque"},
    {id: "2", color: "#3498D8", name: "Paiement accepté", template: "payment"},
    {id: "3", color: "#3498D8", name: "En cours de préparation", template: "preparation"},
    {id: "4", color: "#01B887", name: "Expédié", template: "shipped"},
    {id: "5", color: "#01B887", name: "Livré", template: ""},
    {id: "6", color: "#2C3E50", name: "Annulé", template: "order_canceled"},
    {id: "7", color: "#01B887", name: "Remboursé", template: "refund"},
    {id: "8", color: "#E74C3C", name: "Erreur de paiement", template: "payment_error"},
    {id: "9", color: "#3498D8", name: "En attente de réapprovisionnement (payé)", template: "outofstock"},
    {id: "10", color: "#34209E", name: "En attente de virement bancaire", template: "bankwire"},
    {id: "11", color: "#3498D8", name: "Paiement à distance accepté", template: "payment"},
    {id: "12", color: "#34209E", name: "En attente de réapprovisionnement (non payé)", template: "outofstock"},
    {id: "13", color: "#34209E", name: "En attente de paiement à la livraison", template: "cashondelivery"},
    {id: "14", color: "#34209E", name: "En attente de paiement", template: ""},
    {id: "15", color: "#01B887", name: "Remboursement partiel", template: ""},
    {id: "16", color: "#3498D8", name: "Paiement partiel", template: ""},
    {id: "17", color: "#3498D8", name: "Autorisation. A capturer par le marchand", template: ""},
];

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}



function Orders() {
    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const [pendingStates, setPendingStates] = useState({});

    async function handleUpdateState(orderId, nextState) {
        const option = ORDER_STATE_OPTIONS.find((o) => o.id === nextState);
        const confirmed = window.confirm(
            `Changer l'état de la commande #${orderId} vers "${option?.name}" ?`
        );
        if (!confirmed) return;

        setUpdatingId(orderId);
        setUpdateError(null);

        try {
            await createResource("order_histories", {
                order_history: {
                    id_order: orderId,
                    id_order_state: nextState,
                },
            });

            setOrders((prev) =>
                prev.map((order) =>
                    getScalarValue(order?.id) === orderId
                        ? {...order, current_state: nextState}
                        : order
                )
            );
            setPendingStates((prev) => {
                const next = {...prev};
                delete next[orderId];
                return next;
            });
            setSuccessMessage("Etat de la commande mis à jour.");
        } catch (err) {
            setUpdateError(err);
        } finally {
            setUpdatingId(null);
        }
    }

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
                {updateError && (
                    <StatusBanner
                        variant="error"
                        title="Echec mise à jour"
                        message={updateError?.message}
                    />
                )}
            </header>
            <div className="overflow-x-auto rounded border border-gray-200">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total
                            paid
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">State</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created</th>
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
                        const currentState = String(getScalarValue(order?.current_state) || "1");
                        const createdAt = getScalarValue(order?.date_add) || "N/A";

                        const currentOption = ORDER_STATE_FULL_OPTIONS.find((o) => o.id === currentState);
                        const pendingSelected = pendingStates[id] ?? currentState;
                        const pendingOption = ORDER_STATE_OPTIONS.find((o) => o.id === pendingSelected);
                        const isUpdating = updatingId === id;
                        const isDirty = pendingSelected !== currentState;

                        return (
                            <tr key={id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">{id}</td>
                                <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-900">{reference}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{customerId}</td>
                                <td className="max-w-[160px] truncate px-4 py-3 text-gray-800">{payment}</td>
                                <td className="px-4 py-3 font-mono text-gray-800">{totalPaid}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Current state badge */}
                                        <span
                                            className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                                            style={{backgroundColor: currentOption?.color ?? "#999"}}
                                        >
                                            {currentOption?.name ?? currentState}
                                        </span>

                                        {/* Select with colored left border reflecting the pending choice */}
                                        <select
                                            value={pendingSelected}
                                            onChange={(e) =>
                                                setPendingStates((prev) => ({...prev, [id]: e.target.value}))
                                            }
                                            disabled={isUpdating}
                                            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                                            style={{
                                                borderLeftColor: pendingOption?.color ?? "#ccc",
                                                borderLeftWidth: 3,
                                            }}
                                        >
                                            {ORDER_STATE_OPTIONS.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Apply button — only active when selection differs from current state */}
                                        <button
                                            onClick={() => handleUpdateState(id, pendingSelected)}
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