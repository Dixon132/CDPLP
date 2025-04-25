export class HttpException extends Error{
    errorCode: ErrorCodes;
    statusCode: number;
    error: any;
    constructor(
        message:string,
        errorCode: ErrorCodes,
        statusCode: number,
        error:any){
            super(message)
            this.errorCode = errorCode
            this.statusCode = statusCode
            this.error = error
        }
}

export enum ErrorCodes{
    USER_NOT_FOUND = 1001,
    USER_ALREADY_EXISTS = 1002,
    INCORRECT_PASSWORD = 1003,


    UNPROCESSABLE_ENTITY = 2001,

    INTERNAL_EXCEPTION = 3001,

    UNAUTHORIZED = 4001,
    TOKEN_EXPIRED = 4002,

    
}