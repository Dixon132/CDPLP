import { ErrorCodes, HttpException } from "./root";

class UnauthorizedException extends HttpException{
    constructor(
        message:string,
        errorCode: ErrorCodes
    ){
        super(
            message,
            errorCode,
            401,
            null
        )
    }
}
export default UnauthorizedException