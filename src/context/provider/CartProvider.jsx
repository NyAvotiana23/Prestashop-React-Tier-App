import {useMemo, useState} from "react";
import {CartContext} from "../AppContext.jsx";

export function CartProvider({ children }) {
    const [items, setItems] = useState([]);

    const addItem = (product, quantity = 1) => {
        const nextQuantity = Math.max(1, Number(quantity) || 1);
        setItems((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + nextQuantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity: nextQuantity }];
        });
    };

    const updateQuantity = (productId, quantity) => {
        const nextQuantity = Number(quantity) || 1;
        setItems((prev) =>
            prev
                .map((item) =>
                    item.id === productId ? { ...item, quantity: nextQuantity } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (productId) => {
        setItems((prev) => prev.filter((item) => item.id !== productId));
    };

    const clear = () => setItems([]);

    const total = items.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
        0
    );

    const value = useMemo(
        () => ({ items, addItem, updateQuantity, removeItem, clear, total }),
        [items, total]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}