import { NextFunction, Request, Response } from "express";
import UnauthorizedException from "../exceptions/unauthorized";
import { ErrorCodes } from "../exceptions/root";
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from "../utils/secrets";
import prismaClient from "../utils/prismaClient";
import { MyJwtPayload } from "../types/express";

export const authMiddleware = async(req: Request, res: Response, next: NextFunction)=>{
    try{
        const token = req.headers.authorization
        if(!token){
            throw new UnauthorizedException(
                'Unauthorized!',
                ErrorCodes.UNAUTHORIZED
            )
        }
        const payload = jwt.verify(token, JWT_SECRET!)  as MyJwtPayload
        const user = await prismaClient.usuarios.findFirst({
            where: {id_usuario:payload.userId}
        })
        if(!user){
            throw new UnauthorizedException('Unathorized!', ErrorCodes.UNAUTHORIZED)
        }
        req.user = user
        next()
    }catch(e){
        next(e)
    }
}