import {useEffect, useMemo, useState} from "react";
import {CartContext, DefaultValuesContext} from "../AppContext.jsx";
import {getList} from "../../api/prestashopCrud.js";

const DEFAULT_COUNTRY_ID = "8";
const DEFAULT_CURRENCY_ID = "1";

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
                const [countryResponse, currencyResponse, categoriesResponse] = await Promise.all(
                    [
                        getList("countries", {
                            display: "full",
                            filters: {id: DEFAULT_COUNTRY_ID},
                            signal: controller.signal,
                        }),
                        getList("currencies", {
                            display: "full",
                            filters: {id: DEFAULT_CURRENCY_ID},
                            signal: controller.signal,
                        }),
                        getList("categories", {
                            display: "full",
                            sort: "[id_ASC]",
                            signal: controller.signal,
                        })
                    ]
                )

                if (countryResponse && currencyResponse && categoriesResponse) {
                    const countryResult = countryResponse?.data?.countries?.country;

                    if (countryResult.length > 0) {
                        setDefaultCountry(countryResult[0]);
                    }
                    const currencyResult = currencyResponse?.data?.currencies?.currency;

                    if (currencyResult.length > 0) {
                        setDefaultCurrency(currencyResult[0]);
                    }

                    const categoryResult = categoriesResponse?.data?.categories?.category;

                    if (categoryResult.length > 0) {
                        setDefaultCategories(categoryResult);
                    }
                }
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