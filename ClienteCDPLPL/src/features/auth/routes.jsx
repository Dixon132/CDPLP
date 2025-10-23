
import { AuthLayout } from "../../layouts/AuthLayout";
import Login from "./pages/Login";


export const authRouter = {
    path: '/auth',
    element: <AuthLayout />,
    children: [
        {
            index: true,
            element: <Login />
        },
        {
            path: 'login',
            element: <Login />,
        }
    ]
}