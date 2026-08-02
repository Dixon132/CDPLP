import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { describir } from "../../../utils/auditoria";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import { actualizarCatalogoRolSchema, catalogoRolSchema } from "../schemas/permisos";

/** GET /permisos/catalogo-roles — todos los roles, activos e inactivos. */
export const getCatalogoRoles = async (req: Request, res: Response) => {
    const roles = await prismaClient.catalogo_roles.findMany({
        orderBy: { nombre: "asc" },
    });
    res.status(200).json(roles);
};

/** GET /permisos/catalogo-roles/activos — para selects (asignar rol a un usuario). */
export const getCatalogoRolesActivos = async (req: Request, res: Response) => {
    const roles = await prismaClient.catalogo_roles.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
    });
    res.status(200).json(roles);
};

/** POST /permisos/catalogo-roles — crea un rol de negocio nuevo. */
export const createCatalogoRol = async (req: Request, res: Response) => {
    const { nombre, descripcion } = catalogoRolSchema.parse(req.body);
    const nombreNorm = nombre.trim().toUpperCase().replace(/\s+/g, "_");

    const existente = await prismaClient.catalogo_roles.findUnique({ where: { nombre: nombreNorm } });
    if (existente) {
        throw new BadRequestException(`Ya existe un rol "${nombreNorm}"`, ErrorCodes.USER_ALREADY_EXISTS);
    }

    const rol = await prismaClient.catalogo_roles.create({
        data: { nombre: nombreNorm, descripcion },
    });
    describir(res, `Creó el rol "${rol.nombre}"`);
    res.status(201).json(rol);
};

/** PUT /permisos/catalogo-roles/:id — solo la descripción es editable (el nombre queda fijo tras crearse). */
export const updateCatalogoRol = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existente = await prismaClient.catalogo_roles.findUniqueOrThrow({ where: { id_rol_catalogo: id } });
    if (existente.es_sistema) {
        throw new BadRequestException(`El rol "${existente.nombre}" no puede modificarse`, ErrorCodes.UNPROCESSABLE_ENTITY);
    }
    const { descripcion } = actualizarCatalogoRolSchema.parse(req.body);

    const rol = await prismaClient.catalogo_roles.update({
        where: { id_rol_catalogo: id },
        data: { descripcion },
    });
    describir(res, `Modificó el rol "${rol.nombre}"`);
    res.status(200).json(rol);
};

/** PATCH /permisos/catalogo-roles/:id/estado — activa/desactiva un rol (bloqueado para NO_DEFINIDO). */
export const toggleEstadoCatalogoRol = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existente = await prismaClient.catalogo_roles.findUniqueOrThrow({ where: { id_rol_catalogo: id } });
    if (existente.es_sistema) {
        throw new BadRequestException(`El rol "${existente.nombre}" no puede desactivarse`, ErrorCodes.UNPROCESSABLE_ENTITY);
    }

    const rol = await prismaClient.catalogo_roles.update({
        where: { id_rol_catalogo: id },
        data: { activo: !existente.activo },
    });
    describir(res, `${rol.activo ? "Activó" : "Desactivó"} el rol "${rol.nombre}"`);
    res.status(200).json(rol);
};
