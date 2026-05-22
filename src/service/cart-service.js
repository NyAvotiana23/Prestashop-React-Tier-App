import {createResource, getById, getList} from "../api/prestashopCrud.js";
import {ensureArray, getScalarValue} from "../utils/util-functions.js";

export async function createNewCart (cart) {
    let cartPayload = cart;
    if (!cart?.cart) {
        cartPayload = {
            "cart": cart
        }
    }
    const created = await createResource("carts", cartPayload);
    return getScalarValue(created?.data?.cart?.id);
}

function normalizeCarts(data) {
    return ensureArray(data?.carts?.cart ?? data?.carts ?? []);
}

export function getCartRows(cart) {
    const rows = cart?.associations?.cart_rows?.cart_row ?? cart?.associations?.cart_rows ?? [];
    return ensureArray(rows);
}

export async function listCarts({display = "full", limit, sort, filters, params, signal} = {}) {
    const response = await getList("carts", {
        display,
        limit,
        sort,
        filters,
        params,
        signal,
    });
    return normalizeCarts(response?.data ?? response);
}

export async function getCartById(cartId, {signal} = {}) {
    const response = await getById("carts", cartId, {signal});
    return response?.data?.cart ?? null;
}

export async function listCustomerCarts(customerId, {signal} = {}) {
    const response = await getList("carts", {
        display: "full",
        filters: {id_customer: customerId},
        sort: "[date_add_DESC]",
        params: {date: 1},
        signal,
    });
    return normalizeCarts(response?.data ?? response);
}



export function buildCartPayload({items, customerId, addressId, currencyId, carrierId, langId}) {
    return {
        cart: {
            id_currency: currencyId,
            id_customer: customerId,
            id_lang: langId,
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_carrier: carrierId,
            associations: {
                cart_rows: {
                    cart_row: items.map((item) => ({
                        id_product: item.productId ?? item.id,
                        id_product_attribute: item.productAttributeId ?? 0,
                        id_address_delivery: addressId,
                        quantity: item.quantity,
                    })),
                },
            },
        },
    };
}
