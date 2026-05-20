import {ensureArray, getLanguageText, getScalarValue} from "../utils/util-functions.js";
import {getProductById, getProductPricing} from "./product-service.js";
import {createResource, deleteResource, getById, getList} from "../api/prestashopCrud.js";
import {buildCartPayload, createNewCart} from "./cart-service.js";
import {LIVRE_STATE_ID, updateOrderState} from "./custom-stock-service.js";
import {checkStockFromOrderItems} from "./stock-service.js";

export function getOrderRows(order) {
    return ensureArray(order?.associations?.order_rows?.order_row) ?? [];
}

export function normalizeOrders(data) {
    if (!data || typeof data !== "object") return [];
    const node = data?.orders?.order ?? data?.orders ?? data?.order ?? [];
    return ensureArray(node);
}

export function normalizeOrderPayments(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.order_payments?.order_payment ??
        data?.order_payments ??
        data?.order_payment ??
        [];
    return ensureArray(node);
}

function normalizeOrderInvoices(data) {
    if (!data || typeof data !== "object") return [];
    const node =
        data?.order_invoices?.order_invoice ??
        data?.order_invoices ??
        data?.order_invoice ??
        [];
    return ensureArray(node);
}

export async function listOrders({display = "full", limit, sort, filters, params, signal} = {}) {
    const response = await getList("orders", {
        display,
        limit,
        sort,
        filters,
        params,
        signal,
    });
    return normalizeOrders(response?.data ?? response);
}

export async function listOrdersByStateId(stateId) {
    const response = await getList("orders", {
        display: "full",
        filters: {
            current_state: stateId
        }
    });
    return normalizeOrders(response?.data ?? response);
}

export async function getOrderById(orderId, {signal} = {}) {
    const response = await getById("orders", orderId, {signal});
    return response?.data?.order ?? null;
}

export async function deleteOrderById(orderId, options = {}) {
    return deleteResource("orders", orderId, options);
}


export async function fetchOrderDetail(orderId, {signal} = {}) {
    const response = await getById("orders", orderId, {signal});
    const order = response?.data?.order ?? null;

    if (!order) {
        return {order: null, payments: [], invoices: []};
    }

    const orderReference = getScalarValue(order?.reference);
    const orderIdValue = getScalarValue(order?.id);

    const [paymentsResponse, invoicesResponse] = await Promise.all([
        orderReference
            ? getList("order_payments", {
                display: "full",
                filters: {order_reference: orderReference},
                limit: 50,
                sort: "[id_ASC]",
                signal,
            })
            : Promise.resolve(null),
        orderIdValue
            ? getList("order_invoices", {
                display: "full",
                filters: {id_order: orderIdValue},
                limit: 50,
                sort: "[id_ASC]",
                signal,
            })
            : Promise.resolve(null),
    ]);

    return {
        order,
        payments: normalizeOrderPayments(paymentsResponse?.data ?? paymentsResponse),
        invoices: normalizeOrderInvoices(invoicesResponse?.data ?? invoicesResponse),
    };
}

export async function fetchOrderStatesMap({signal, limit = "0,100"} = {}) {
    const response = await getList("order_states", {
        display: "full",
        limit,
        signal,
    });
    const items = ensureArray(response?.data?.order_states?.order_state ?? []);
    return items.reduce((acc, state) => {
        const id = getScalarValue(state?.id);
        const name = getLanguageText(state?.name);
        if (id) acc[id] = name || "Etat";
        return acc;
    }, {});
}

export async function findOrderByCartId(cartId, {signal} = {}) {
    const response = await getList("orders", {
        display: "[id,reference]",
        filters: {id_cart: cartId},
        limit: "0,1",
        signal,
    });
    const items = normalizeOrders(response?.data ?? response);
    const first = items[0];
    if (!first) return null;
    return {
        id: getScalarValue(first?.id || first?.["@_id"]),
        reference: getScalarValue(first?.reference),
    };
}


export async function createOrder(order) {
    let orderPayload = order;
    if (!order?.order) {
        orderPayload = {
            "order": order
        }
    }
    const created = await createResource("orders", orderPayload);
    return getScalarValue(created?.data?.order?.id);
}

export async function buildOrderRowsFromItems(items) {
    const enrichedRows = await Promise.all(
        items.map(async (item) => {
            const productId = item.productId ?? item.id;
            const combinationId = item.productAttributeId ?? 0;
            const pricing = await getProductPricing(productId, combinationId);
            return {
                product_id: productId,
                product_attribute_id: combinationId,
                product_quantity: item.quantity,
                product_name: item.name,
                product_reference: item.reference ?? "",
                product_price: pricing.priceTtc.toFixed(6),
                unit_price_tax_incl: pricing.priceTtc.toFixed(6),
                unit_price_tax_excl: pricing.priceHt.toFixed(6),
                _productId: productId,
                _combinationId: String(combinationId),
                _quantity: item.quantity,
                _priceHt: pricing.priceHt,
            };
        })
    );

    const orderRows = enrichedRows.map(
        ({_productId, _combinationId, _quantity, _priceHt, ...apiFields}) => apiFields
    );

    const totalPaid = orderRows
        .reduce(
            (sum, row) => sum + Number(row.unit_price_tax_incl) * Number(row.product_quantity || 0),
            0
        )
        .toFixed(6);

    return {orderRows, totalPaid, enrichedRows};
}

export async function buildOrderRowsFromCart(cart) {
    const cartRows = ensureArray(cart?.associations?.cart_rows?.cart_row ?? cart?.associations?.cart_rows ?? []);
    const enrichedRows = await Promise.all(
        cartRows.map(async (row) => {
            const productId = getScalarValue(row?.id_product);
            const combinationId = getScalarValue(row?.id_product_attribute) || "0";
            const quantity = Number(getScalarValue(row?.quantity) ?? 1);

            const [pricing, product] = await Promise.all([
                getProductPricing(productId, combinationId),
                getProductById(productId),
            ]);
            const productName = getLanguageText(product?.name) || `Produit ${productId}`;
            const productReference = getScalarValue(product?.reference) || "";
            return {
                product_id: productId,
                product_attribute_id: combinationId,
                product_quantity: quantity,
                product_name: productName,
                product_reference: productReference,
                product_price: pricing.priceTtc.toFixed(6),
                unit_price_tax_incl: pricing.priceTtc.toFixed(6),
                unit_price_tax_excl: pricing.priceHt.toFixed(6),
                _productId: productId,
                _combinationId: combinationId,
                _quantity: quantity,
                _priceHt: pricing.priceHt,
            };
        })
    );

    const orderRows = enrichedRows.map(
        ({_productId, _combinationId, _quantity, _priceHt, ...apiFields}) => apiFields
    );

    const totalPaid = orderRows
        .reduce(
            (sum, row) => sum + Number(row.unit_price_tax_incl) * Number(row.product_quantity || 0),
            0
        )
        .toFixed(6);

    return {orderRows, totalPaid, enrichedRows};
}

export async function calculateTotalPaidFromCartItems(items) {
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

export async function buildOrderPayload(cartPayload, addressId) {
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

export function buildProductIdsFilterFromOrderRows(rows) {
    const ids = [];
    for (const row of rows) {
        const productId = getScalarValue(row?.product_id ?? row?.id_product ?? row?.productId ?? row?.product_id);
        if (productId) ids.push(productId);
    }
    return ids.join("|");
}

export function buildOrderPayloadFromCart({
                                              cartId,
                                              addressId,
                                              currencyId,
                                              langId,
                                              customerId,
                                              carrierId,
                                              totalPaid
                                          }) {
    return {
        order: {
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_cart: cartId,
            id_currency: currencyId,
            id_lang: langId,
            id_customer: customerId,
            id_carrier: carrierId,
            module: "ps_cashondelivery",
            payment: "Paiement a la livraison",
            total_paid: totalPaid,
            total_paid_real: totalPaid,
            total_products: totalPaid,
            total_products_wt: totalPaid,
            conversion_rate: "1",
            // associations: {
            //     order_rows: {
            //         order_row: orderRows,
            //     },
            // },
        },
    };
}

export async function duplicateOrder(idOrder, quantityDuplication, nextState, checkStock = false) {
    const order = await getOrderById(idOrder);

    const orderRows = getOrderRows(order);

    if (checkStock) {
        const stockResult = await checkStockFromOrderItems(orderRows, quantityDuplication);
        console.log("Stock result : ", stockResult);
        if (!stockResult) {
            alert("Checking stock => stock is not enough !");
            return ;
        }
    }
    if (true) return ;

    const items = orderRows.map((row) => ({
        productId: getScalarValue(row?.product_id),
        productAttributeId: getScalarValue(row?.product_attribute_id),
        quantity: parseFloat(getScalarValue(row?.product_quantity)) * parseFloat(quantityDuplication),
    }))

    const cartPayload = buildCartPayload(
        {
            items,
            customerId: getScalarValue(order?.id_customer),
            addressId: getScalarValue(order?.id_address_invoice),
            currencyId: getScalarValue(order?.id_currency),
            carrierId: getScalarValue(order?.id_carrier),
            langId: getScalarValue(order?.id_lang)
        }
    );

    const cartCreatedId = await createNewCart(cartPayload);

    const {totalPaid} = await buildOrderRowsFromItems(items);
    const orderPayload = buildOrderPayloadFromCart(
        {
            cartId: cartCreatedId,
            addressId: getScalarValue(order?.id_address_invoice),
            currencyId: getScalarValue(order?.id_currency),
            langId: getScalarValue(order?.id_lang),
            customerId: getScalarValue(order?.id_customer),
            carrierId: getScalarValue(order?.id_carrier),
            totalPaid
        }
    );
    const orderCreatedId = await createOrder(orderPayload);

    if (!nextState) {
        nextState = getScalarValue(order?.current_state);
    }

    await updateOrderState({
            orderId: orderCreatedId,
            stateId: nextState,
            effectiveDate: new Date()
        }
    );

    return orderCreatedId;
}