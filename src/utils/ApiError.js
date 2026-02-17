class ApiError extends Error{
    constructor(
        statusCode,
        message="somethin went worng",
        errors=[],
        statck=""
    ){
        super(message)
        this.statusCode=statusCode
        this.message=message
        this.success=false;
        this.errors=errors

        if(stack){
            this.stack=statck
        }else{
            Error.captureStackTrace(this,this.constructo)

        }
    }
}

export {ApiError}