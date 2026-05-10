
import Orders from "../components/order/Orders.jsx";
import OrdersDetail from "../components/order/OrdersDetail.jsx";

export const orderRoutes = {
    path: "orders",
    children: [
        {index: true, element: <Orders/>},
        {path: ":orderId", element: <OrdersDetail/>},
    ],
};
