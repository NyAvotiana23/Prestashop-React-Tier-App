import React, {useEffect, useMemo, useState} from 'react';
import {Link, useParams} from "react-router-dom";
import {getCustomerById} from "../../service/customer-service.js";
import {getScalarValue, isAbortError} from "../../utils/util-functions.js";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import Modal from "../shared/Modal.jsx";
import UrlDescriptionCard from "../shared/UrlDescriptionCard.jsx";

function CustomerDetail(props) {
    const {customerId} = useParams();
    const [customer, setCustomer] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [status, setStatus] = useState("idle");
    const [selectedResource, setSelectedResource] = useState(null);


    useEffect(() => {
        const controller = new AbortController();

        async function loadCustomer() {
            if (!customerId) return;
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const resultCustomer = await getCustomerById(customerId, {
                    signal: controller.signal,
                });
                setCustomer(resultCustomer);
                setStatus("success");
                setSuccessMessage(resultCustomer ? "Customer loaded successfully." : "Customer not found.");
            } catch (error) {
                if (isAbortError(error, controller.signal)) return;
                setError(error);
                setStatus("error");
            }
        }

        loadCustomer();
    }, [customerId]);

    const content = useMemo(
        () => {
            if (status === "loading") {
                return <Loading>Customer</Loading>
            }
            if (status === "error") {
                return (
                    <StatusBanner variant={"error"} title={"Failed to load customer"} message={error?.message}/>
                )
            }
            if (!customer) {
                return <p className="text-gray-600">Customer not found.</p>;
            }

            const id = getScalarValue(customer?.id);
            const firstName = getScalarValue(customer?.firstname);
            const lastName = getScalarValue(customer?.lastname);
            const email = getScalarValue(customer?.email);
            const birthDay = getScalarValue(customer?.birthday)

            return (
                <div className="space-y-6">
                    <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                        <header className="space-y-2">
                            <h1 className="text-2xl font-semibold text-gray-900">{firstName} - {lastName}</h1>
                            <p className="text-sm text-gray-500">ID: {id}</p>
                        </header>
                        <div className="mt-4">
                            <p>First name : {firstName}</p>
                            <p>Last name : {lastName}</p>
                            <p>Email : {email}</p>
                            <p>Birth day : {birthDay}</p>
                        </div>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Linked ressource :</h2>
                        <div className="mt-4 divide-y divide-gray-100">
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedResource(customer?.id_default_group)}
                                    className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"

                                >
                                    Open default group : {getScalarValue(customer?.id_default_group)}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedResource(customer?.id_lang)}
                                    className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"

                                >
                                    Open launguage : {getScalarValue(customer?.id_lang)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            )

        }
    );
    return (
        <section className="space-y-6">
            <Link to={"/admin/customers"}
                  className={"inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700"}
            >
                Back to cutsomers
            </Link>
            <h2>Customer : {customerId}</h2>
            <StatusBanner variant={"success"} message={successMessage}>
            </StatusBanner>
            {content}

            <Modal
                isOpen={Boolean(selectedResource)}
                title="Linked ressource"
                onClose={() => setSelectedResource(null)}
            >
                <UrlDescriptionCard node={selectedResource}/>
            </Modal>

        </section>
    );
}

export default CustomerDetail;