import {createBrowserRouter} from "react-router-dom";
import BackOfficeLayout from "../layouts/BackOfficeLayout.jsx";
import FrontOfficeLayout from "../layouts/FrontOfficeLayout.jsx";
import Dashboard from "../pages/Dashboard";
import {catalogRoutes} from "./catalogue-router";
import ImportDatabase from "../pages/ImportDatabase.jsx";
import ResetDatabase from "../pages/ResetDatabase.jsx";
import AdminLogin from "../pages/AdminLogin.jsx";
import {customerRoutes} from "./customer-router.jsx";
import {orderRoutes} from "./order-router.jsx";

import FrontHome from "../pages/front/FrontHome.jsx";
import FrontLogin from "../pages/front/FrontLogin.jsx";
import FrontProductDetail from "../pages/front/FrontProductDetail.jsx";
import FrontCart from "../pages/front/FrontCart.jsx";
import FrontOrders from "../pages/front/FrontOrders.jsx";
import FrontOrderDetail from "../pages/front/FrontOrderDetail.jsx";
import {AdminUserProvider} from "../context/provider/AdminUserProvider.jsx";
import {RequireAdmin} from "../context/RequireAdmin.jsx";
import {CustomerUserProvider} from "../context/provider/CustomerUserProvider.jsx";
import {CartProvider} from "../context/provider/CartProvider.jsx";
import {RequireCustomer} from "../context/RequireCustomer.jsx";
import FrontSelectUser from "../pages/front/FrontSelectUser.jsx";
import {DefaultValuesProvider} from "../context/provider/DefaultValuesProvider.jsx";

export const router = createBrowserRouter([
    {
        path: "/admin",
        element: (
            <AdminUserProvider>
                <BackOfficeLayout/>
            </AdminUserProvider>
        ),
        children: [
            {path: "login", element: <AdminLogin/>},
            {
                element: <RequireAdmin/>,
                children: [
                    {index: true, element: <Dashboard/>},
                    {path: "reset-database", element: <ResetDatabase/>},
                    {path: "import-database", element: <ImportDatabase/>},
                    catalogRoutes,
                    customerRoutes,
                    orderRoutes,
                ],
            },
        ],
    },
    {
        path: "/",
        element: (

            <CustomerUserProvider>
                <CartProvider>
                    <FrontOfficeLayout/>
                </CartProvider>
            </CustomerUserProvider>
        ),
        children: [
            {index: true, element: <FrontSelectUser/>},
            {path: "products", element: <FrontHome/>},
            {path: "select_user", element: <FrontSelectUser/>},
            {path: "login", element: <FrontLogin/>},
            {path: "products/:productId", element: <FrontProductDetail/>},
            {
                element: <RequireCustomer/>,
                children: [
                    {path: "cart", element: <FrontCart/>},
                    {path: "orders", element: <FrontOrders/>},
                    {path: "orders/:orderId", element: <FrontOrderDetail/>},
                ],
            },
        ],
    },
]);
