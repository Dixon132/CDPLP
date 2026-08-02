import { Router } from "express";
import catalogoRolesRouter from "./catalogo-roles";
import recursosRouter from "./recursos";
import rolPermisosRouter from "./rol-permisos";
import usuarioPermisosRouter from "./usuario-permisos";
import misPermisosRouter from "./mis-permisos";

const permisosRouter: Router = Router();

permisosRouter.use("/mis-permisos", misPermisosRouter);
permisosRouter.use("/catalogo-roles", catalogoRolesRouter);
permisosRouter.use("/recursos", recursosRouter);
permisosRouter.use("/rol-permisos", rolPermisosRouter);
permisosRouter.use("/usuarios", usuarioPermisosRouter);

export default permisosRouter;
