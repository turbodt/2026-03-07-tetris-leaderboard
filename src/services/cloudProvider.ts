import 'dotenv/config';
import type {
    ServiceContainer,
    AsyncInitializable,
    ReplayValidator,
    ReplayRepository,
    ReplayStorage
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";
import { ReplayReader } from "./replayReader.js";
import { PostgresRepository } from "./postgresRepository.js";
import { ReplayValidatorWASM } from "./validatorWASM.js";
import { S3Storage } from './S3Storage.js';



export class CloudServiceProvider
implements ServiceContainer, AsyncInitializable {
    public reader: ReplayReader;
    private _validator: ReplayValidatorWASM | null;
    private _repository: PostgresRepository | null;
    private _storage: S3Storage | null;

    public constructor() {
        this.reader =  new ReplayReader();
        this._validator = null;
        this._repository = null;
        this._storage = null;
    }

    public async initialize(): Promise<void> {
        this._validator = new ReplayValidatorWASM();
        this._repository = new PostgresRepository();
        this._storage = new S3Storage();

        await this._validator.initialize(this.reader).then(() => {
            console.log('✅ Validador WASM ready.');
        });
        await this._repository.initialize().then(() => {
            console.log('✅ Postgres repository ready.');
        });
        await this._storage.initialize(this.reader).then(() => {
            console.log('✅ S3 Storage ready.');
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

    public get storage(): ReplayStorage {
        if (this._storage === null) {
            throw new ServiceNotLoadedError('ReplayStorage');
        }

        return this._storage;
    }
};
