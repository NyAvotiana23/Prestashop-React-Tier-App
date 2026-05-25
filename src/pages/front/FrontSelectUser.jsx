import React, {useEffect, useRef, useState} from 'react';
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {useLocation, useNavigate} from "react-router-dom";
import { ensureCustomerAnonym} from "../../csv/mappings/csvOrderMapping.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {ANONYM_CUSTOMER_EMAIL} from "../../csv/mappings/csvOrderMapping.js";
import {listCustomers} from "../../service/customer-service.js";

function FrontSelectUser(props) {
    const {login} = useCustomerUser();
    const [customers, setCustomers] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const selectRef = useRef(ANONYM_CUSTOMER_EMAIL);
    const redirectTo = location.state?.from?.pathname ?? "/products";

    useEffect(() => {
        const controller = new AbortController();

        async function loadCustomers() {
            const items = await listCustomers({
                display: "full",
                sort: "[id_ASC]",
                signal: controller.signal,
            });
            setCustomers(items);
        }

        loadCustomers();
        return () => controller.abort();

    }, []);

    async function handleSelectCustomer(event) {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const email = selectRef.current.value;
            if (email === ANONYM_CUSTOMER_EMAIL) {
                await ensureCustomerAnonym();
            }
            const result = await login(email);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            navigate(redirectTo, {replace: true});
        } catch (err) {
            setError(err?.message ?? "Connexion impossible");
        } finally {
            setLoading(false);
        }
    }



    return (
        <section className="mx-auto max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <header className="space-y-2">
                <h2 className="text-2xl font-semibold">Selection d'utilisateur</h2>
                <p className="text-sm text-zinc-500">Connectez-vous pour valider votre commande.</p>
            </header>
            {
                customers && (
                    <>
                        <form onSubmit={handleSelectCustomer}>
                            <select
                                ref={selectRef}

                                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                            >
                                <option value={ANONYM_CUSTOMER_EMAIL}>Anonyme</option>
                                {customers.map((c) =>
                                    <option key={getScalarValue(c?.id)}
                                            value={getScalarValue(c?.email)}>
                                        {getScalarValue(c?.lastname)}--{getScalarValue(c?.firstname)}--{getScalarValue(c?.email)}
                                    </option>
                                )}

                            </select>
                            <button type={"submit"}
                                    disabled={loading}
                                    className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                Valider
                            </button>
                        </form>
                    </>
                )
            }
        </section>
    );
}

export default FrontSelectUser;