import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {getList} from "../../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {useDefaultValues} from "../../hooks/useDefaultValues.jsx";

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

export default function FrontOrders() {
    const {defaultCountry, defaultCurrency, loadingDefaultValues} = useDefaultValues();

    const {customerUser} = useCustomerUser();
    const [orders, setOrders] = useState([]);
    const [orderStates, setOrderStates] = useState({});
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadOrders() {
            if (!customerUser?.id) return;

            try {
                setStatus("loading");
                setError(null);

                const [ordersResponse, statesResponse] = await Promise.all([
                    getList("orders", {
                        display: "full",
                        filters: {id_customer: customerUser.id},
                        sort: "[id_DESC]",
                        signal: controller.signal,
                    }),
                    getList("order_states", {
                        display: "full",
                        limit: "0,100",
                        signal: controller.signal,
                    }),
                ]);

                const items = normalizeOrders(ordersResponse?.data);
                const stateItems = ensureArray(
                    statesResponse?.data?.order_states?.order_state ?? []
                );

                const nextStateMap = stateItems.reduce((acc, state) => {
                    const id = getScalarValue(state?.id);
                    const name = getLanguageText(state?.name);
                    if (id) acc[id] = name || "Etat";
                    return acc;
                }, {});

                setOrders(items);
                setOrderStates(nextStateMap);
                setStatus("success");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadOrders();
        return () => controller.abort();
    }, [customerUser]);

    if (status === "loading") return <Loading>commandes</Loading>;
    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Erreur chargement commandes"
                message={error?.message}
            />
        );
    }

    if (!orders.length) {
        return <p className="text-sm text-zinc-500">Aucune commande.</p>;
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-semibold">Mes commandes</h2>
                <p className="text-sm text-zinc-500">Etat et historique des commandes.</p>
            </header>

            <div className="space-y-4">
                {orders.map((order) => {
                    const id = getScalarValue(order?.id);
                    const reference = getScalarValue(order?.reference) || "—";
                    const totalPaid = getScalarValue(order?.total_paid) || "0";
                    const stateId = getScalarValue(order?.current_state);
                    const stateName = orderStates[stateId] || stateId || "—";
                    const detailPath = id ? `/orders/${id}` : "/orders";

                    return (
                        <Link
                            key={id || reference}
                            to={detailPath}
                            className="block rounded border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-zinc-500">Commande #{reference}</p>
                                    <p className="text-xs text-zinc-400">ID: {id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500">Total</p>
                                    <p className="text-lg font-semibold text-emerald-600">{totalPaid}  {getLanguageText(defaultCurrency?.symbol)} </p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-500">Etat</p>
                                    <p className="text-sm font-semibold text-zinc-800">{stateName}</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
