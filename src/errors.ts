export class AppError extends Error {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
};

export class DoesNotExistError extends AppError {
    public constructor(resource: string) {
        super(`Resource '${resource}' does not exist.`);
        Object.setPrototypeOf(this, DoesNotExistError.prototype);
    }
}

export class AlreadyExistsError extends AppError {
    public constructor(resource: string) {
        super(`Resource '${resource}' already exists.`);
        Object.setPrototypeOf(this, AlreadyExistsError.prototype);
    }
}


export class NotUniqueError extends AppError {
    public constructor(resource: string) {
        super(`Resource '${resource}' is not unique.`);
        Object.setPrototypeOf(this, NotUniqueError.prototype);
    }
}
