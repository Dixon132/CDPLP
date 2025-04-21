import { JwtPayload } from "jsonwebtoken";
import {} from '@prisma/client'
import * as express from 'express'
import { usuarios } from "../generated/prisma";


declare module "express"{
    export interface Request{
        user?: usuarios, 
    }
}

export interface MyJwtPayload extends JwtPayload {
    userId: int;
}
