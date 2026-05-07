// No createBrowserRouter here — just export the raw route config
import RootLayout from "../layouts/RootLayout";
import Products from "../components/product/Products.jsx";
import ProductDetail from "../components/product/ProductDetail.jsx";

export const commandeRoutes = {
    path: "catalog",
    children: [
        { path: "products", element: <Products /> },
        { path: "products/:productId", element: <ProductDetail /> },
    ],
};
