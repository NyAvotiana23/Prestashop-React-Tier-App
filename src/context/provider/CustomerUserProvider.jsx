import {useEffect, useMemo, useState} from "react";
import {getList} from "../../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../../utils/util-functions.js";
import {CustomerUserContext} from "../AppContext.jsx";

const CUSTOMER_STORAGE_KEY = "prestashop.customerUser";

function loadStoredCustomer() {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && typeof parsed.email === "string") {
            return {
                id: parsed.id,
                email: parsed.email,
                firstname: parsed.firstname ?? "",
                lastname: parsed.lastname ?? "",
            };
        }
    } catch {
        return null;
    }
    return null;
}

function toStoredCustomer(user) {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        firstname: user.firstname ?? "",
        lastname: user.lastname ?? "",
    };
}

export function CustomerUserProvider({children}) {
    const [customerUser, setCustomerUser] = useState(loadStoredCustomer);

    const login = async (email) => {
        const normalizedEmail = String(email ?? "").trim().toLowerCase();

        if (!normalizedEmail) {
            return {ok: false, error: "Email requis."};
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

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (customerUser) {
            window.localStorage.setItem(
                CUSTOMER_STORAGE_KEY,
                JSON.stringify(toStoredCustomer(customerUser))
            );
        } else {
            window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        }
    }, [customerUser]);

    const value = useMemo(
        () => ({customerUser, login, logout}),
        [customerUser]
    );

    return <CustomerUserContext.Provider value={value}>{children}</CustomerUserContext.Provider>;
}