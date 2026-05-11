import {useMemo, useState} from "react";

import {AdminUserContext} from "../AppContext.jsx";

const DEFAULT_ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin",
};

export function AdminUserProvider({children, defaultCredentials = DEFAULT_ADMIN_CREDENTIALS}) {
    const [adminUser, setAdminUser] = useState(null);

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

    const value = useMemo(
        () => ({adminUser, login, logout, defaultCredentials}),
        [adminUser, defaultCredentials, login]
    );

    return <AdminUserContext.Provider value={value}>{children}</AdminUserContext.Provider>;
}