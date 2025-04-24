import { createBrowserRouter } from "react-router-dom";
import { authRouter } from "../features/auth/routes";
import { dashboardRoutes } from "../features/dashboard/routes";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>

    },
    dashboardRoutes,
    authRouter,
    {
        path: "*",
        element: <div>404</div>
    }
])