import { NextFunction, Request, Response } from "express";
import { loginSchema, signupSchema } from "../schemas/auth";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import { hashSync, compareSync } from 'bcrypt'
import NotFoundException from "../../../exceptions/not-found";
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from "../../../utils/secrets";
import UnauthorizedException from "../../../exceptions/unauthorized";
import { describir, registrarAuditoria } from "../../../utils/auditoria";
import { Acciones, Modulos } from "../../../types/auditoria";
import { emitirNotificacion } from "../../notificaciones/services";
export const singUp = async (req: Request, res: Response) => {
    const validated = signupSchema.parse(req.body)
    const {
        nombre,
        apellido,
        correo,
        contraseña,
        telefono,
        direccion,
    } = req.body

    let user = await prismaClient.usuarios.findFirst({
        where: { correo }
    })
    if (user) {
        throw new BadRequestException('El usuario ya existe!', ErrorCodes.USER_ALREADY_EXISTS)
    }
    user = await prismaClient.usuarios.create({
        data: {
            nombre,
            apellido,
            correo,
            contrase_a: hashSync(contraseña, 10),
            telefono,
            direccion
        }
    })
    const rolNoDefinido = await prismaClient.catalogo_roles.findFirstOrThrow({
        where: { nombre: "NO_DEFINIDO" }
    })
    await prismaClient.roles.create({
        data: {
            id_usuario: user.id_usuario,
            id_rol_catalogo: rolNoDefinido.id_rol_catalogo
        }
    })
    describir(res, `Se creó el usuario ${user.nombre} ${user.apellido} (${user.correo})`)
    await emitirNotificacion({
        modulo: Modulos.USUARIOS,
        tipo: 'exito',
        titulo: 'Nuevo usuario del sistema',
        descripcion: `${user.nombre} ${user.apellido} (${user.correo})`,
        enlace: '/dashboard/usuarios',
        idUsuario: req.user?.id_usuario,
    })
    const { contrase_a, ...usuarioPublico } = user
    res.json(usuarioPublico)
}

export const login = async (req: Request, res: Response) => {

    const {
        correo,
        contraseña
    } = req.body
    let user = await prismaClient.usuarios.findFirst({ where: { correo } })
    if (!user) {
        throw new UnauthorizedException('Usuario no encontrado!', ErrorCodes.USER_NOT_FOUND)
    }
    if (!compareSync(contraseña, user.contrase_a!)) {
        throw new UnauthorizedException('Contraseña incorrecta!', ErrorCodes.USER_NOT_FOUND)
    }
    // Fila de rol más reciente del usuario (corrige un bug preexistente: antes
    // no se ordenaba y Postgres podía devolver cualquier fila del histórico,
    // no la vigente). Deliberadamente NO se filtra por `activo`/vigencia acá:
    // un rol vencido o inactivo debe poder iniciar sesión igual para que el
    // cliente lo redirija a la pantalla correspondiente (`RequirePermiso`
    // hace esa validación); bloquear el login sería un error 500 opaco.
    const rolRow = await prismaClient.roles.findFirst({
        where: {
            id_usuario: user.id_usuario
        },
        orderBy: { id_rol: 'desc' },
        include: { catalogo_roles: true }
    })

    const rol = {
        rol: rolRow?.catalogo_roles?.nombre ?? 'NO_DEFINIDO',
        fecha_inicio: rolRow?.fecha_inicio ?? null,
        fecha_fin: rolRow?.fecha_fin ?? null,
        activo: rolRow?.activo ?? false,
    }

    const token = jwt.sign({
        userId: user.id_usuario,
        rol
    }, JWT_SECRET!, { expiresIn: '8h' })
    // No pasa por el wrapper de `errorHandler`: en este punto `req.user` todavía
    // no existe (recién se está generando el token), así que se audita a mano.
    await registrarAuditoria(user.id_usuario, Acciones.INICIO_SESION, Modulos.USUARIOS, `${user.nombre} ${user.apellido} inició sesión`)
    const { contrase_a, ...usuarioPublico } = user
    res.json({ user: usuarioPublico, token })
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
    // `req.user` ya viene sin contraseña desde authMiddleware.
    res.json(req.user)
}
