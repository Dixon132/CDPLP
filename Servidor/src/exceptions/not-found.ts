import { ErrorCodes, HttpException } from "./root";

class NotFoundException extends HttpException{
    constructor(
        message: string,
        errorCode: ErrorCodes
    ){
        super(
            message,
            errorCode,
            404, 
            null
        )
    }
}
export default NotFoundException