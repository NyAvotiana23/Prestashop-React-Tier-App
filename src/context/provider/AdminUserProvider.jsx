import {useEffect, useMemo, useState} from "react";

import {AdminUserContext} from "../AppContext.jsx";

const DEFAULT_ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin",
};

const ADMIN_STORAGE_KEY = "prestashop.adminUser";

function loadStoredAdmin() {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.username === "string") {
            return {username: parsed.username};
        }
    } catch {
        return null;
    }
    return null;
}

export function AdminUserProvider({children, defaultCredentials = DEFAULT_ADMIN_CREDENTIALS}) {
    const [adminUser, setAdminUser] = useState(loadStoredAdmin);

    const login = (username, password) => {
        const normalizedUser = String(username ?? "").trim();
        const normalizedPassword = String(password ?? "").trim();

        if (
            normalizedUser === defaultCredentials.username &&
            normalizedPassword === defaultCredentials.password
        ) {
            const user = {username: normalizedUser};
            setAdminUser(user);
            return {ok: true, user};
        }

        return {ok: false, error: "Identifiants admin invalides."};
    };

    const logout = () => setAdminUser(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (adminUser) {
            window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
        } else {
            window.localStorage.removeItem(ADMIN_STORAGE_KEY);
        }
    }, [adminUser]);

    const value = useMemo(
        () => ({adminUser, login, logout, defaultCredentials}),
        [adminUser, defaultCredentials, login]
    );

    return <AdminUserContext.Provider value={value}>{children}</AdminUserContext.Provider>;
}