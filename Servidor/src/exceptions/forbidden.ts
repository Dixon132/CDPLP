import { ErrorCodes, HttpException } from "./root";

class ForbiddenException extends HttpException {
    constructor(
        message: string,
        errorCode: ErrorCodes
    ) {
        super(
            message,
            errorCode,
            403,
            null
        )
    }
}
export default ForbiddenException
