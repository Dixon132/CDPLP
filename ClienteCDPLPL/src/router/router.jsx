import { createBrowserRouter } from "react-router-dom";
import { authRouter } from "../features/auth/routes";
import { dashboardRoutes } from "../features/dashboard/routes";
import NotFound from "../features/users/pages/NotFound";
import userRouter from "../features/users/routes";
import AccesoPage from "../features/campo/AccesoPage";
import CampoPage from "../features/campo/CampoPage";
import { gdsRoutes } from "../features/gds/routes";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>
    },
    {
        path: "/acceso",
        element: <AccesoPage />
    },
    {
        path: "/campo/:tipo/:id",
        element: <CampoPage />
    },
    dashboardRoutes,
    authRouter,
    userRouter,
    gdsRoutes,
    {
        path: "*",
        element: <NotFound />
    }
])
