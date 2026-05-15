import React, {useCallback, useEffect, useState} from 'react';
import {getList} from "../api/prestashopCrud.js";
import {ensureArray, formatMoney, getScalarValue, isAbortError} from "../utils/util-functions.js";
import Loading from "../components/shared/Loading.jsx";
import StatusBanner from "../components/shared/StatusBanner.jsx";

function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const ordersNode = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(ordersNode);
}

function addValues(val1, val2) {
    if (!val1) {
        val1 = 0;
    }
    val2 = getScalarValue(val2);
    if (!val2) {
        val2 = 0;
    }
    val2 = parseFloat(val2);
    return val1 + val2;

}

const TODAY = new Date().toLocaleDateString('en-CA');

function Dashboard(props) {
    const [availableDate, setAvailableDate] = useState([]);
    const [selectedDate, setSelectedDate] = useState(TODAY);
    const [statistics, setStatistics] = useState({
        total_paid: 0,
        total_paid_tax_incl: 0,
        total_paid_tax_excl: 0,
        total_orders: 0,
        total_paid_real: 0
    });

    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const [pendingStates, setPendingStates] = useState({});

    function generateStats(items, dates) {
        const initialStats = {
            total_paid: 0,
            total_paid_tax_incl: 0,
            total_paid_tax_excl: 0,
            total_orders: 0,
            total_paid_real: 0
        };
        return items.reduce(
            (acc, item) => {
                acc.total_paid = addValues(acc.total_paid, item?.total_paid);
                acc.total_paid_real = addValues(acc.total_paid_real, item?.total_paid_real);
                acc.total_paid_tax_incl = addValues(acc.total_paid_tax_incl, item?.total_paid_tax_incl);
                acc.total_paid_tax_excl = addValues(acc.total_paid_tax_excl, item?.total_paid_tax_excl);
                acc.total_orders = addValues(acc.total_orders, 1);
                if (dates) dates.add(getScalarValue(item?.date_add)?.split(' ')[0]);
                return acc;
            }, initialStats
        );
    }

    async function handleFilter(event) {
        event.preventDefault();


        const formData = new FormData(event.target);
        let {real_date} = Object.fromEntries(formData.entries());

        if (real_date) {
            const dateString = real_date;
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const response = await getList("orders", {
                    display: "full",
                    sort: "[id_ASC]",
                    params: {
                        "filter[date_add]": `[${dateString} 00:00:00,${dateString} 23:59:59]`,
                        "date": 1
                    }
                });

                const items = normalizeOrders(response?.data);

                if (!response?.data) {
                    setError(new Error("Invalid response format"));
                    setStatus("error");
                    return;
                }

                setStatistics(generateStats(items, null));

                setOrders(items);
                setStatus("success");
                setSuccessMessage(`Loaded ${items.length} orders.`);
            } catch (err) {
                setError(err);
                setStatus("error");
            }
        }
    }

    const loadOrders = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);
            setSuccessMessage("");

            const response = await getList("orders", {
                display: "full",
                sort: "[id_ASC]",
                signal,
            });

            if (!response?.data) {
                setError(new Error("Invalid response format"));
                setStatus("error");
                return;
            }

            const items = normalizeOrders(response?.data);
            const dates = new Set();

            setStatistics(generateStats(items, dates));
            setAvailableDate(Array.from(dates));
            setOrders(items);
            setStatus("success");
            setSuccessMessage(`Loaded ${items.length} orders.`);
        } catch (err) {
            if (isAbortError(err)) return;
            setError(err);
            setStatus("error");
        }
    }, []);

    function handleReset() {
        setSelectedDate(TODAY);
        loadOrders(); // reload all orders globally
    }

    useEffect(() => {
        const controller = new AbortController();
        loadOrders(controller.signal);
        return () => controller.abort();
    }, [loadOrders]);

    if (status === "loading") {
        return <Loading>Loading Statistics</Loading>
    }
    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Failed to load orders"
                message={error?.message}
            />
        );
    }
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <form onSubmit={handleFilter}>
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Filters</h2>
                    <div className="flex flex-wrap gap-4 items-end">

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-600">Specific date</label>
                            <input
                                value={selectedDate}
                                type="date"
                                name="real_date"
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-600">Available dates</label>
                            <select
                                name="date_available"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) setSelectedDate(val);
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">-- pick a date --</option>
                                {availableDate.map((date, i) => (
                                    <option key={i} value={date}>{date}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
                        >
                            Apply filters
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
                        >
                            Reset
                        </button>

                    </div>
                </form>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Statistiques</h2>
                {statistics && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total orders</p>
                            <p className="text-2xl font-bold text-gray-800">{statistics.total_orders}</p>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total paid</p>
                            <p className="text-2xl font-bold text-blue-700">{formatMoney(statistics.total_paid)}</p>
                        </div>

                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total paid real</p>
                            <p className="text-2xl font-bold text-green-700">{formatMoney(statistics.total_paid_real)}</p>
                        </div>

                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Tax incl.</p>
                            <p className="text-2xl font-bold text-purple-700">{formatMoney(statistics.total_paid_tax_incl)}</p>
                        </div>

                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Tax excl.</p>
                            <p className="text-2xl font-bold text-orange-700">{formatMoney(statistics.total_paid_tax_excl)}</p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;