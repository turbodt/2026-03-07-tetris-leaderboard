import 'dotenv/config';
import type {
    ServiceContainer,
    AsyncInitializable,
    ReplayValidator,
    ReplayRepository
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";
import { ReplayReader } from "./replayReader.js";
import { PostgresRepository } from "./postgresRepository.js";
import { ReplayValidatorWASM } from "./validatorWASM.js";



export class CloudServiceProvider
implements ServiceContainer, AsyncInitializable {
    public reader: ReplayReader;
    private _validator: ReplayValidatorWASM | null;
    private _repository: PostgresRepository | null;

    public constructor() {
        this.reader =  new ReplayReader();
        this._validator = null;
        this._repository = null;
    }

    public async initialize(): Promise<void> {
        this._validator = new ReplayValidatorWASM();
        this._repository = new PostgresRepository();

        await this._validator.initialize(this.reader).then(() => {
            console.log('✅ Validador WASM ready.');
        });
        await this._repository.initialize(this.reader).then(() => {
            console.log('✅ Memory repository ready.');
        });
    };

    public get validator(): ReplayValidator {
        if (this._validator === null) {
            throw new ServiceNotLoadedError('ReplayValidator');
        }

        return this._validator;
    }

    public get repository(): ReplayRepository {
        if (this._repository === null) {
            throw new ServiceNotLoadedError('ReplayRepository');
        }

        return this._repository;
    }
};
