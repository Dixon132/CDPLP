import { NextFunction, Request, Response } from "express";
import { loginSchema, signupSchema } from "../schemas/auth";
import prismaClient from "../../../utils/prismaClient";
import BadRequestException from "../../../exceptions/bad-request";
import { ErrorCodes } from "../../../exceptions/root";
import {hashSync, compareSync} from 'bcrypt'
import NotFoundException from "../../../exceptions/not-found";
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from "../../../utils/secrets";
import UnauthorizedException from "../../../exceptions/unauthorized";
export const singUp = async(req: Request, res: Response)=>{
    const validated = signupSchema.parse(req.body)
    const {
        nombre,
        apellido,
        correo,
        contraseña,
        telefono,
        direccion
    } = validated
    let user = await prismaClient.usuarios.findFirst({
        where: {correo}
    })
    if(user){
        throw new BadRequestException('El usuario ya existe!', ErrorCodes.USER_ALREADY_EXISTS)
    }
    user = await prismaClient.usuarios.create({
        data:{
            nombre,
            apellido,
            correo,
            contrase_a: hashSync(contraseña, 10),
            telefono,
            direccion
        }
    })
    res.json(user)
}

export const login = async(req: Request, res: Response)=>{
    
    const {
        correo,
        contraseña
    } = req.body
    let user = await prismaClient.usuarios.findFirst({where: {correo}})
    if(!user){
        throw new UnauthorizedException('Usuario no encontrado!',ErrorCodes.USER_NOT_FOUND)
    }
    if(!compareSync(contraseña,user.contrase_a!)){
        throw new UnauthorizedException('Contraseña incorrecta!',ErrorCodes.USER_NOT_FOUND)
    }
    const rol = await prismaClient.roles.findFirstOrThrow({
        where:{
            id_usuario: user.id_usuario
        },
        select:{
            rol: true
        }

    })
    
    const token = jwt.sign({
        userId: user.id_usuario,
        rol
    }, JWT_SECRET!, {expiresIn: '200h'})
    res.json({user, token})
}   

export const me =async(req: Request,res: Response,next: NextFunction)=>{
    res.json(req.user)
}
