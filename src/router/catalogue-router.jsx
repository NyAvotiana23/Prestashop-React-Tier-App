// No createBrowserRouter here — just export the raw route config
import Products from "../components/product/Products.jsx";
import ProductDetail from "../components/product/ProductDetail.jsx";
import {customerRoutes} from "./customer-router.jsx";
import StockAvailable from "../components/stock/StockAvailable.jsx";

export const catalogRoutes = {
    path: "catalog",
    children: [
        {path: "products", element: <Products/>},
        {path: "stock_availables", element: <StockAvailable/>},
        {path: "products/:productId", element: <ProductDetail/>},
    ],
};
