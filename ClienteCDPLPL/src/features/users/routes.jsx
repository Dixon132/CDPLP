import UserLayout from "../../layouts/UserLayout";
import { Contact } from "./pages/Contacto";


import Home from "./pages/Home";
import About from "./pages/Nosotros";

const userRouter = {
    path: '/',
    element: <UserLayout/>,
    children: [
        {
            index: true,
            element: <Home/>
        },
        {
            path: '/nosotros',
            element: <About/>
        },
        {
            path: '/contacto',
            element: <Contact/>
        }
    ]
}


export default userRouter;