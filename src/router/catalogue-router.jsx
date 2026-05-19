// No createBrowserRouter here — just export the raw route config
import Products from "../components/product/Products.jsx";
import ProductDetail from "../components/product/ProductDetail.jsx";
import {customerRoutes} from "./customer-router.jsx";
import StockAvailable from "../components/stock/StockAvailable.jsx";
import StockMovements from "../components/stock/StockMovements.jsx";
import ManageStock from "../components/stock/ManageStock.jsx";

export const catalogRoutes = {
    path: "catalog",
    children: [
        {path: "products", element: <Products/>},
        {path: "stock_availables", element: <StockAvailable/>},
        {path: "stock_movements", element: <StockMovements/>},
        {path: "manage_stock", element: <ManageStock/>},
        {path: "products/:productId", element: <ProductDetail/>},
    ],
};
