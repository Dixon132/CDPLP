import { ErrorCodes, HttpException } from "./root";

class BadRequestException extends HttpException{
    constructor(
        message: string,
        errorCode: ErrorCodes,
        e?: any
    ){
        super(
            message,
            errorCode,
            400,
            e
        )
    }
}
export default BadRequestException