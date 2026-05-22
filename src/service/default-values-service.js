import {getList} from "../api/prestashopCrud.js";
import {ensureArray} from "../utils/util-functions.js";

export const DEFAULT_COUNTRY_ID = "8";
export const DEFAULT_CURRENCY_ID = "1";
export const DEFAULT_CARRIER_ID = "1";
export const DEFAULT_LANG_ID = "1";
export async function fetchDefaultValues({
    signal,
    countryId = DEFAULT_COUNTRY_ID,
    currencyId = DEFAULT_CURRENCY_ID,
} = {}) {
    const [countryResponse, currencyResponse, categoriesResponse] = await Promise.all([
        getList("countries", {
            display: "full",
            filters: {id: countryId},
            signal,
        }),
        getList("currencies", {
            display: "full",
            filters: {id: currencyId},
            signal,
        }),
        getList("categories", {
            display: "full",
            sort: "[id_ASC]",
            signal,
        }),
    ]);

    const countries = ensureArray(countryResponse?.data?.countries?.country ?? []);
    const currencies = ensureArray(currencyResponse?.data?.currencies?.currency ?? []);
    const categories = ensureArray(categoriesResponse?.data?.categories?.category ?? []);

    return {
        country: countries[0] ?? null,
        currency: currencies[0] ?? null,
        categories,
    };
}


