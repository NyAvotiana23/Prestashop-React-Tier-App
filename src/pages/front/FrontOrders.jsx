import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {useDefaultValues} from "../../hooks/useDefaultValues.jsx";
import {duplicateOrder, fetchOrderStatesMap, listOrders} from "../../service/order-service.js";
import {LIVRE_STATE_ID} from "../../service/custom-stock-service.js";

function PatchModal({order, onClose}) {
    const [duplicatedNumber, setDuplicatedNumber] = useState(1);
    async function handleDuplicate () {
        if (!window.confirm("Dupliquer directement ?")) return;
        const orderId = await duplicateOrder(getScalarValue(order?.id), duplicatedNumber, LIVRE_STATE_ID, true);
        alert(`Order ${getScalarValue(order?.id)}  duplicated successfully new id: ${orderId} and history to livré`);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col gap-3 mt-5">
                    <label>Nombre de duplication : </label>
                    <input type={"number"} value={duplicatedNumber}
                           onChange={(e) => setDuplicatedNumber(e.target.value)}
                           className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                    <Link to={`/orders/duplicate/${getScalarValue(order?.id)}/${duplicatedNumber}`}
                    className={"p-2 bg-red-300 rounded"}
                    >
                        Voir la fiche
                    </Link>

                    <button onClick={handleDuplicate} className={"p-2 bg-gray-200 rounded"}>Dupliquer immédiatement!</button>

                    <button onClick={onClose} className={"p-2 bg-blue-200 rounded"}>Fermer</button>
                </div>
            </div>
        </div>
    )
        ;
}

export default function FrontOrders() {

    const {defaultCountry, defaultCurrency, loadingDefaultValues} = useDefaultValues();

    const {customerUser} = useCustomerUser();
    const [orders, setOrders] = useState([]);
    const [orderStates, setOrderStates] = useState({});
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const [isOpenModal, setIsOpenModal] = useState(false);
    const [selesctedOrders, setSelectedOrders] = useState(null);

    function handleOnCloseModal() {
        setIsOpenModal(false);
        setSelectedOrders(null);
    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadOrders() {
            if (!customerUser?.id) return;

            try {
                setStatus("loading");
                setError(null);

                const [items, nextStateMap] = await Promise.all([
                    listOrders({
                        display: "full",
                        filters: {id_customer: customerUser.id},
                        sort: "[id_DESC]",
                        signal: controller.signal,
                    }),
                    fetchOrderStatesMap({signal: controller.signal}),
                ]);

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

    function openModal(e, order) {
        setIsOpenModal(true);
        setSelectedOrders(order);
    }

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

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm text-zinc-500">Commande #{reference}</p>
                                <p className="text-xs text-zinc-400">ID: {id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Total</p>
                                <p className="text-lg font-semibold text-emerald-600">{totalPaid} {getLanguageText(defaultCurrency?.symbol)} </p>
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">Etat</p>
                                <p className="text-sm font-semibold text-zinc-800">{stateName}</p>
                            </div>
                            <div className={"space-x-2"}>
                                <Link
                                    to={`/orders/${getScalarValue(order?.id)}`}
                                    className={"p-2 bg-blue-500 rounded"}
                                >
                                    Detail
                                </Link>
                                <button
                                    onClick={(e) => openModal(e, order)}
                                    className={"p-2 bg-green-500 rounded"}
                                >Dupliquer
                                </button>
                            </div>
                        </div>

                    )
                        ;
                })}
            </div>
            {isOpenModal && selesctedOrders !== null &&
                (
                    <PatchModal order={selesctedOrders} onClose={handleOnCloseModal}/>
                )

            }

        </section>
    );
}
