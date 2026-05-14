import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";

import {router} from "./router/router.jsx";
import {RouterProvider} from "react-router-dom";
import {HelmetProvider} from "react-helmet-async";
import {DefaultValuesProvider} from "./context/provider/DefaultValuesProvider.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <HelmetProvider>
            <DefaultValuesProvider>
                <RouterProvider router={router}/>
            </DefaultValuesProvider>
        </HelmetProvider>
    </StrictMode>,
);
