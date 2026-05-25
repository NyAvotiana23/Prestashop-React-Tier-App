import React, {useEffect, useState} from 'react';
import {useParams} from "react-router-dom";
import Loading from "../../components/shared/Loading.jsx";
import {ensureArray, getScalarValue} from "../../utils/util-functions.js";
import {getStockByProductIds} from "../../service/stock-service.js";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";

import {
    buildProductIdsFilterFromOrderRows,
    duplicateOrder,
    getOrderById,
} from "../../service/order-service.js";
import {LIVRE_STATE_ID} from "../../service/custom-stock-service.js";

function FrontOrderDuplication(props) {
    const {orderId, duplicateNumber} = useParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [stockAvailables, setStockAvailables] = useState(null);

    const [stockByAttribute, setStockByAttribute] = useState({});
    const [isValid, setIsValid] = useState(true);

    const {customerUser} = useCustomerUser();

    const normalizedDuplicateNumber = Number.parseFloat(duplicateNumber);
    const effectiveDuplicateNumber = Number.isFinite(normalizedDuplicateNumber) && normalizedDuplicateNumber > 0
        ? normalizedDuplicateNumber
        : 1;

    async function handleValiderDuplication() {
        setLoading(true);
        try {
            const orderCreated = await duplicateOrder(orderId, effectiveDuplicateNumber, LIVRE_STATE_ID, true);
            alert(`Order ${orderId}  duplicated successfully new id: ${orderCreated} and history to livré`);
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
            setIsValid(true);
            try {
                const orderData = await getOrderById(orderId);

                if (orderData) {
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
                    const quantiteFinale = parseFloat(row?.product_quantity) * effectiveDuplicateNumber;
                    const combinationId = getScalarValue(row?.product_attribute_id) || "0";

                    const stock = stockAvailablesByProduct?.[String(productId)]?.[String(combinationId)] ?? 0;

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
    }, [orderId, effectiveDuplicateNumber]);


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
                        const quantiteFinale = parseFloat(row?.product_quantity) * effectiveDuplicateNumber;
                        const combinationId = getScalarValue(row?.product_attribute_id) || "0";

                        const stock = stockAvailables?.[String(productId)]?.[String(combinationId)] ?? 0;

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