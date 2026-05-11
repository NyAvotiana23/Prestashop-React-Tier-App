import {useContext} from "react";
import {CustomerUserContext} from "../context/AppContext.jsx";

export function useCustomerUser() {
    const context = useContext(CustomerUserContext);
    if (!context) {
        throw new Error("useCustomerUser must be used within CustomerUserProvider");
    }
    return context;
}