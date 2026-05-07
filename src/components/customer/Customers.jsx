import React, {useEffect, useState} from 'react';
import {ensureArray, getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import {getList} from "../../api/prestashopCrud.js";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {Link} from "react-router-dom";

function normalizeCustomers(data) {
    if (!data || typeof data !== "object") return [];

    const customerNode = data?.customers?.customer ?? data?.customers ?? data?.customer ?? [];
    return ensureArray(customerNode);
}

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadCustomers() {
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const response = await getList("customers", {
                    display: "full",
                    limit: 50,
                    sort: "[id_ASC]",
                    signal: controller.signal,
                });

                const items = normalizeCustomers(response?.data);

                // Fix #4: the real failure case is an unexpected shape (not a missing
                // array — normalizeCustomers always returns an array). Detect it by
                // checking whether data itself is present at all.
                if (!response?.data) {
                    setError(new Error("Invalid response format"));
                    setStatus("error");
                    return;
                }

                setCustomers(items);
                setStatus("success");
                setSuccessMessage(`Loaded ${items.length} customers.`);
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadCustomers();
        return () => controller.abort();
    }, []);

    if (status === "loading") return <Loading>Customers</Loading>;

    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Failed to load customers"
                message={error?.message}
            />
        );
    }

    if (!customers.length) {
        return <p className="text-gray-500">No Customers found.</p>;
    }

    return (
        <section className="space-y-4">
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
                    <p className="text-gray-500">Browse customers from the PrestaShop API.</p>
                </div>
                <StatusBanner variant="success" message={successMessage}/>
            </header>
            <div className="overflow-x-auto rounded border border-gray-200">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Full
                            Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                        <th className="px-4 py-3"/>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {customers.map((customer) => {

                        const id = getScalarValue(customer?.id);
                        const lastname = getScalarValue(customer?.lastname) || "—";
                        const firstname = getScalarValue(customer?.firstname) || "—";
                        const email = getScalarValue(customer?.email) || "—";
                        const active = String(getScalarValue(customer?.active)) === "1";

                        return (
                            <tr key={id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">{id}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">{lastname} {firstname}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">{email}</td>
                                <td className="px-4 py-3">
                                    {active ? (
                                        <span
                                            className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        Inactive
                      </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Link
                                        to={`/customers/${id}`}
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

export default Customers;