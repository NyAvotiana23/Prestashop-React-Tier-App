import {useContext} from "react";
import {AdminUserContext} from "../context/AppContext.jsx";

export default function useAdminUser() {
    const context = useContext(AdminUserContext);
    if (!context) {
        throw new Error("useAdminUser must be used within AdminUserProvider");
    }
    return context;
}