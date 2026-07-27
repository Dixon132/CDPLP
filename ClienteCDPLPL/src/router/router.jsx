import { createBrowserRouter } from "react-router-dom";
import { authRouter } from "../features/auth/routes";
import { dashboardRoutes } from "../features/dashboard/routes";
import NotFound from "../features/public/pages/NotFound";
import AccesoPage from "../features/campo/AccesoPage";
import CampoPage from "../features/campo/CampoPage";
import { gdsRoutes } from "../features/gds/routes";
import PostularPage from "../features/postulaciones/PostularPage";

import { PublicLayout } from "../layouts/PublicLayout";
import Home from "../features/public/pages/Home";
import About from "../features/public/pages/About";
import Contact from "../features/public/pages/Contact";
import MemoriasBalances from "../features/public/pages/MemoriasBalances";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <PublicLayout />,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: "nosotros",
                element: <About />
            },
            {
                path: "contacto",
                element: <Contact />
            },
            {
                path: "memorias",
                element: <MemoriasBalances />
            },
            {
                path: "postular",
                element: <PostularPage />
            }
        ]
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
    gdsRoutes,
    {
        path: "*",
        element: <NotFound />
    }
])
