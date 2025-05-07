import { createBrowserRouter } from "react-router-dom";
import { authRouter } from "../features/auth/routes";
import { dashboardRoutes } from "../features/dashboard/routes";
import NotFound from "../features/users/pages/NotFound";
import userRouter from "../features/users/routes";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>

    },
    dashboardRoutes,
    authRouter,
    userRouter,
    {
        path: "*",
        element: <NotFound/>
    }
])