import {useCustomerUser} from "../hooks/useCustomerUser.jsx";
import {Navigate, Outlet, useLocation} from "react-router-dom";

export function RequireCustomer() {
    const { customerUser } = useCustomerUser();
    const location = useLocation();

    if (!customerUser) {
        return <Navigate to="/select_user" replace state={{ from: location }} />;
    }

    return <Outlet />;
}