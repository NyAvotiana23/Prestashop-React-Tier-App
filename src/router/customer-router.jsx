import Customers from "../components/customer/Customers.jsx";
import CustomerDetail from "../components/customer/CustomerDetail.jsx";


export const customerRoutes = {
    path: "customers",
    children: [
        {index: true, element: <Customers/>},
        {path: ":customerId", element: <CustomerDetail/>},
    ],
};
