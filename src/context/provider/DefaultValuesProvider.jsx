import {useEffect, useMemo, useState} from "react";
import {CartContext, DefaultValuesContext} from "../AppContext.jsx";
import {fetchDefaultValues} from "../../service/default-values-service.js";

export function DefaultValuesProvider({children}) {
    const [loadingDefaultValues, setLoadingDefaultValues] = useState(true);
    const [defaultCountry, setDefaultCountry] = useState(null);
    const [defaultCurrency, setDefaultCurrency] = useState(null);
    const [defaultCategories, setDefaultCategories] = useState([]);

    const [errors, setErrors] = useState([]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadDefaultValues() {
            setLoadingDefaultValues(true);
            try {
                const result = await fetchDefaultValues({signal: controller.signal});
                setDefaultCountry(result.country ?? null);
                setDefaultCurrency(result.currency ?? null);
                setDefaultCategories(result.categories ?? []);
            } catch (error) {
                console.log(error)
                setErrors(error);
            } finally {
                setLoadingDefaultValues(false);
            }
        }

        loadDefaultValues();

        return () => controller.abort();

    }, []);


    const value = useMemo(
        () => {

            return {defaultCountry, defaultCurrency, errors, loadingDefaultValues, defaultCategories}
        }, [defaultCountry, defaultCurrency, errors, loadingDefaultValues, defaultCategories]
    )

    return <DefaultValuesContext.Provider value={value}>{children}</DefaultValuesContext.Provider>;
}