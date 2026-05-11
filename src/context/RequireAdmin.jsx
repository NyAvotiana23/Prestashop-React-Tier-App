import useAdminUser from "../hooks/useAdminUser.jsx";
import {Navigate, Outlet, useLocation} from "react-router-dom";

export function RequireAdmin(){
    const { adminUser } = useAdminUser();
    const location = useLocation();

    if (!adminUser) {
        return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}