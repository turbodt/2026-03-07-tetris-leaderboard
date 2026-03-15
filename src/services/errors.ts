import { AppError } from "../errors.js";


export class ConfigError extends AppError {
    public constructor(message: string) {
        super(`[Configuration]: ${message}`);
        Object.setPrototypeOf(this, ConfigError.prototype);
    }
};

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


