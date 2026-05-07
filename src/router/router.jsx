import {createBrowserRouter} from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import Dashboard from "../pages/Dashboard";
import {catalogRoutes} from "./catalogue-router";
import ResetDatabase from "../pages/ResetDatabase.jsx";
import {commandeRoutes} from "./commande-router.jsx";
import ImportDatabase from "../pages/ImportDatabase.jsx";
import {customerRoutes} from "./customer-router.jsx";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout/>,
        children: [
            {index: true, element: <Dashboard/>},
            {path: "/reset-database", element: <ResetDatabase/>},
            {path: "/import-database", element: <ImportDatabase/>},

            catalogRoutes,
            customerRoutes,
            commandeRoutes
        ],
    },
]);
