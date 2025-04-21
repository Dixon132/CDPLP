import { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorCodes, HttpException } from "../exceptions/root";
import BadRequestException from "../exceptions/bad-request";
import { ZodError } from "zod";
import InternalException from "../exceptions/internal-exception";

type AsyncController = (
    req: Request,
    res: Response,
    next: NextFunction
)=>Promise<any>;

const errorHandler = (method:AsyncController): RequestHandler=>{
    return async(req: Request, res: Response, next: NextFunction)=>{
        try{
            await method(req,res,next)
        }catch(e:any){
            let exception: HttpException;
            if(e instanceof HttpException){
                exception = e
            }else{
                if(e instanceof ZodError){
                    exception = new BadRequestException(
                        'Unprocessable entity', 
                        ErrorCodes.USER_ALREADY_EXISTS,
                        e
                    )
                }else{
                    exception = new InternalException(
                        'Something went wrong!',
                        ErrorCodes.INCORRECT_PASSWORD,
                        e
                    )
                }
            }
            next(exception)
        }
    }
}
export default errorHandler