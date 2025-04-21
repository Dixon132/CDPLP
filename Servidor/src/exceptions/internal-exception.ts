import { ErrorCodes, HttpException } from "./root";

class InternalException extends HttpException{
    constructor(
        message: string,
        errorCode: ErrorCodes,
        e: any
    ){  
        super(
            message,
            errorCode,
            500,
            e
        )
    }
}
export default InternalException