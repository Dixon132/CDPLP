import { ErrorRequestHandler, NextFunction, Request, Response } from "express"
import { HttpException } from "../exceptions/root"

const errorMiddleware:ErrorRequestHandler = (
    error:HttpException, 
    req: Request, 
    res: Response, 
    next: NextFunction
)=>{
    res.status(error.statusCode).json({
        message: error.message,
        errorCode: error.errorCode,
        error: error.error
    })
}
export default errorMiddleware
