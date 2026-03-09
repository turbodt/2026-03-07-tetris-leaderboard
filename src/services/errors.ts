import { AppError } from "../base.js";


export class ServiceError extends AppError {
    public constructor(serviceName: string, message: string) {
        super(`[${serviceName}]: ${message}`);
        Object.setPrototypeOf(this, ServiceError.prototype);
    }
};

export class ServiceNotLoadedError extends ServiceError {
    public constructor(serviceName: string) {
        super(serviceName, "Not loaded yet.");
        Object.setPrototypeOf(this, ServiceNotLoadedError.prototype);
    }
};


