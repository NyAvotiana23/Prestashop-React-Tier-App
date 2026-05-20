import React, {use, useEffect, useState} from 'react';
import {useParams} from "react-router-dom";
import {addWhitespaceAroundMathOperators} from "tailwindcss/src/util/math-operators.js";
import {getById, getList} from "../../api/prestashopCrud.js";
import Loading from "../../components/shared/Loading.jsx";
import {ensureArray, getScalarValue} from "../../utils/util-functions.js";
import {getStockByProductIds} from "../../service/stock-service.js";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {getFirstId} from "../../csv/mappings/csvMappingUtils.js";
import {getFirstCustomerAddress} from "../../service/customer-service.js";
import {buildOrderPayload, createOrder, getOrderRows} from "../../service/order-service.js";
import {createNewCart} from "../../service/cart-service.js";
import {LIVRE_STATE_ID, updateOrderState} from "../../service/custom-stock-service.js";


function buildProductIdsFilterFromOrderRows(rows) {
    const ids = [];
    for (const row of rows) {
        const productId = getScalarValue(row?.product_id);
        ids.push(productId);
    }
    return ids.join("|");
}

function FrontOrderDuplication(props) {
    const {orderId, duplicateNumber} = useParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [stockAvailables, setStockAvailables] = useState(null);

    const [stockByAttribute, setStockByAttribute] = useState({});
    const [isValid, setIsValid] = useState(true);

    const {customerUser} = useCustomerUser();

    function buildNewOrderItemsForCart() {
        const orderRows = getOrderRows(order);
        const items = orderRows.map((row) => ({
            productId: getScalarValue(row?.product_id),
            productAttributeId: getScalarValue(row?.product_attribute_id),
            quantity: parseFloat(getScalarValue(row?.product_quantity)) * parseFloat(duplicateNumber),
        }))
        return items;
    }

    async function handleValiderDuplication() {
        setLoading(true);
        try {
            const address = await getFirstCustomerAddress(customerUser?.id);
            const addressId = getScalarValue(address?.id);
            const items = buildNewOrderItemsForCart();
            console.table(items);

            const currencyId = (await getFirstId("currencies")) || "1";
            const carrierId = (await getFirstId("carriers")) || "1";
            const langId = "1";


            const cart = {
                id_currency: currencyId,
                id_customer: customerUser.id,
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
            }

            console.log(cart);
            const idCart = await createNewCart(cart);
            cart["id"] = idCart;

            const orderPayload = await buildOrderPayload(cart, addressId);
            const orderCreated = await createOrder(orderPayload);
            await updateOrderState({
                    orderId: orderCreated,
                    stateId: LIVRE_STATE_ID,
                    effectiveDate: new Date()
                }
            );
            alert(`Order created ${orderCreated} and history to livré`);

        } catch (error) {
            console.log("Error : " + error.message);
            setError(error.message);
        } finally {
            setLoading(false);
        }

    }


    useEffect(() => {
        const controller = new AbortController();

        async function loadData() {

            setLoading(true);
            setError(null);
            try {
                const orderResponse = await getById("orders", orderId);
                const orderData = orderResponse?.data?.order;

                if (orderResponse) {
                    setOrder(orderData);
                } else {
                    throw new Error("Order not fetched " + orderId)
                }


                const orderRows = ensureArray(orderData?.associations?.order_rows?.order_row);
                const productIds = buildProductIdsFilterFromOrderRows(orderRows);
                console.log(productIds);
                const stockAvailablesByProduct = await getStockByProductIds(productIds);

                setStockAvailables(stockAvailablesByProduct);

                for (const row of orderRows) {
                    const productId = getScalarValue(row?.product_id);
                    const quantiteFinale = parseFloat(row?.product_quantity) * parseFloat(duplicateNumber);
                    const combinationId = getScalarValue(row?.product_attribute_id);

                    const stock = stockAvailablesByProduct[String(productId)][String(combinationId)];

                    const isAvailable = quantiteFinale <= parseFloat(stock);
                    if (!isAvailable) {
                        setIsValid(false);
                        return;
                    }
                }
            } catch (error) {
                console.log(error);
                setError(error.message);
            } finally {
                setLoading(false);
            }

        }

        loadData();
    }, []);


    if (loading) {
        return <Loading>Order loading</Loading>
    }

    return (
        <div>
            <h2>Appercue de la duplication : </h2>

            <p>Order Id : {orderId}</p>
            <p>Duplicate number : {duplicateNumber}</p>
            {error && <p>Error : {error}</p>}
            {order && (
                <div>
                    <h3>Detail : </h3>
                    {ensureArray(order?.associations?.order_rows?.order_row).map((row, i) => {
                        const productId = getScalarValue(row?.product_id);
                        const quantiteFinale = parseFloat(row?.product_quantity) * parseFloat(duplicateNumber);
                        const combinationId = getScalarValue(row?.product_attribute_id);

                        const stock = stockAvailables[String(productId)][String(combinationId)];

                        const isAvailable = quantiteFinale <= parseFloat(stock);

                        return <div key={i}>
                            <p>{getScalarValue(row?.product_id)} Product name : {row?.product_name} Quantité initiale
                                : {row?.product_quantity} Quantité finale : {quantiteFinale}
                            </p>
                            <p>Stock produit : {stock} </p>
                            <p>{isAvailable ? "Quantité suffisante" : "Qantité insuffisante"}</p>
                        </div>

                    })}

                </div>
            )}
            <div className={"flex flex-row - gap-5"}>
                <p>{isValid ? "Stock valide" : "Stock manquante"}</p>
                {isValid && <button className={"p-2 bg-green-200 rounded"} onClick={handleValiderDuplication}>
                    Valider

                </button>}
            </div>

        </div>
    );
}

export default FrontOrderDuplication;