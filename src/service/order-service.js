import {ensureArray, getScalarValue} from "../utils/util-functions.js";
import {getProductPricing} from "./product-service.js";
import {createResource} from "../api/prestashopCrud.js";

export function getOrderRows (order) {
    return ensureArray(order?.associations?.order_rows?.order_row) ?? [];
}


export async function createOrder (order) {
    let orderPayload = order;
    if (!order?.order) {
        orderPayload = {
            "order": order
        }
    }
    const created = await createResource("orders", orderPayload);
    return getScalarValue(created?.data?.order?.id);
}
export async function calculateTotalPaidFromCartItems (items) {
    let result = 0;
    for (const item of items) {
        console.log("Item in calc ", item)
        const idProduct = item.id_product;
        const idAttribute = item.id_product_attribute;
        const quantity = item.quantity;

        const pricing = await getProductPricing(idProduct, idAttribute);
        result += parseFloat(pricing.priceTtc) * parseFloat(quantity);
    }
    return result;
}

export async function buildOrderPayload (cartPayload, addressId) {
    const totalPaid = (await calculateTotalPaidFromCartItems(cartPayload.associations.cart_rows.cart_row)).toFixed(6);
    return {
        order: {
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_cart: cartPayload.id,
            id_currency: cartPayload.id_currency,
            id_lang: cartPayload.id_lang,
            id_customer: cartPayload.id_customer,
            id_carrier: cartPayload.id_carrier,
            module: "ps_cashondelivery",
            payment: "Paiement a la livraison",
            total_paid: totalPaid,
            total_paid_real: totalPaid,
            total_products: totalPaid,
            total_products_wt: totalPaid,
            conversion_rate: "1",
        },
    };
}