import { Outlet } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Login } from "./pages/Login";
import Signup  from "./pages/SignUp";

export const authRouter = {
    path: '/auth',
    element: <AuthLayout/>,
    children:[
        {
            index: true,
            element: <Login/>
        },
        {
            path: 'login',
            element: <Login/>,
        },
        {
            path: 'signup',
            element: <Signup/>,
        }
    ]
}