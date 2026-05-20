import {createResource, getById, getList} from "../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../utils/util-functions.js";


function normalizeAddresses(data) {
    return ensureArray(data?.addresses?.address ?? data?.addresses ?? []);
}

function normalizeCustomers(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.customers?.customer ?? data?.customers ?? data?.customer ?? [];
    return ensureArray(node);
}

export async function listCustomers({display = "full", limit = 50, sort, filters, signal} = {}) {
    const response = await getList("customers", {
        display,
        limit,
        sort,
        filters,
        signal,
    });
    return normalizeCustomers(response?.data ?? response);
}

export async function getCustomerById(customerId, {signal} = {}) {
    const response = await getById("customers", customerId, {signal});
    return response?.data?.customer ?? null;
}

export async function findCustomerByEmail(email, {signal} = {}) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail) return null;

    const response = await getList("customers", {
        display: "full",
        filters: {email: normalizedEmail},
        limit: "0,5",
        signal,
    });

    const customers = normalizeCustomers(response?.data ?? response);
    return (
        customers.find((customer) =>
            String(getScalarValue(customer?.email) ?? "").toLowerCase() === normalizedEmail
        ) ?? null
    );
}

export async function getCustomerAddresses(customerId, {limit = "0,10", signal} = {}) {
    const response = await getList("addresses", {
        display: "full",
        filters: {id_customer: customerId},
        limit,
        signal,
    });
    return normalizeAddresses(response?.data ?? response);
}

export async function getCustomerAddressId(customerId, {signal} = {}) {
    const response = await getList("addresses", {
        display: "[id]",
        filters: {id_customer: customerId},
        limit: "0,1",
        signal,
    });
    const items = normalizeAddresses(response?.data ?? response);
    const first = items[0];
    return getScalarValue(first?.id || first?.["@_id"]);
}

export async function createCustomerAddress(address, {signal} = {}) {
    const response = await createResource("addresses", {address}, {signal});
    return response?.data?.address ?? null;
}

export async function getFirstCustomerAddress(customerId, {signal} = {}) {
    const addressesData = await getCustomerAddresses(customerId, {limit: "0,1", signal});
    return addressesData.length > 0 ? addressesData[0] : null;
}