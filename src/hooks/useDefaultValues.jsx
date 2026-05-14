import {useContext} from "react";
import {CartContext, DefaultValuesContext} from "../context/AppContext.jsx";

export function useDefaultValues() {
    const context = useContext(DefaultValuesContext);
    if (!context) {
        throw new Error("useDefaultValues must be used within DefaultValuesProvider");
    }
    return context;
}