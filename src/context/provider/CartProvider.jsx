import {useEffect, useMemo, useState} from "react";
import {CartContext} from "../AppContext.jsx";

export function CartProvider({children}) {
    const [items, setItems] = useState([]);


    function getLineId(product) {
        if (product?.lineId) return String(product.lineId);
        const productId = product?.productId ?? product?.id;
        const attributeId = product?.productAttributeId ?? 0;
        return `${productId}:${attributeId}`;
    }


    const updateQuantity = (lineId, quantity) => {
        const nextQuantity = Number(quantity) || 1;
        setItems((prev) =>
            prev
                .map((item) =>
                    item.lineId === lineId ? {...item, quantity: nextQuantity} : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (lineId) => {
        setItems((prev) => prev.filter((item) => item.lineId !== lineId));
    };

    const clear = () => setItems([]);

    const total = items.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
        0
    );

    const value = useMemo(
        () => {
            const addItem = (product, quantity = 1) => {
                const nextQuantity = Math.max(1, Number(quantity) || 1);
                const lineId = getLineId(product);
                setItems((prev) => {
                    const existing = prev.find((item) => item.lineId === lineId);
                    if (existing) {
                        return prev.map((item) =>
                            item.lineId === lineId
                                ? {...item, quantity: item.quantity + nextQuantity}
                                : item
                        );
                    }
                    return [...prev, {...product, lineId, quantity: nextQuantity}];
                });
            };

            return {items, addItem, updateQuantity, removeItem, clear, total}
        }
        ,
        [items, total]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}