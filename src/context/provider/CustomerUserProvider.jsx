import {useMemo, useState} from "react";
import {getList} from "../../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../../utils/util-functions.js";
import {CustomerUserContext} from "../AppContext.jsx";

export function CustomerUserProvider({children}) {
    const [customerUser, setCustomerUser] = useState(null);

    const login = async (email, password) => {
        const normalizedEmail = String(email ?? "").trim().toLowerCase();
        const normalizedPassword = String(password ?? "").trim();

        if (!normalizedEmail || !normalizedPassword) {
            return {ok: false, error: "Email et mot de passe requis."};
        }

        const response = await getList("customers", {
            display: "full",
            filters: {email: normalizedEmail},
            limit: "0,5",
        });

        const customers = ensureArray(
            response?.data?.customers?.customer ?? response?.data?.customers ?? []
        );

        const match = customers.find((customer) => {
            const customerEmail = String(getScalarValue(customer?.email) ?? "").toLowerCase();
            return customerEmail === normalizedEmail;
        });

        if (!match) {
            return {ok: false, error: "Client introuvable."};
        }

        const storedPassword = getScalarValue(match?.passwd);
        if (storedPassword !== normalizedPassword) {
            return {ok: false, error: "Mot de passe invalide."};
        }

        const user = {
            id: getScalarValue(match?.id),
            email: normalizedEmail,
            firstname: getScalarValue(match?.firstname),
            lastname: getScalarValue(match?.lastname),
            raw: match,
        };

        setCustomerUser(user);
        return {ok: true, user};
    };

    const logout = () => setCustomerUser(null);

    const value = useMemo(
        () => ({customerUser, login, logout}),
        [customerUser]
    );

    return <CustomerUserContext.Provider value={value}>{children}</CustomerUserContext.Provider>;
}