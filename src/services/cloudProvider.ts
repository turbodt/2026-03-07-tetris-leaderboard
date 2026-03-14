import type {
    ServiceContainer,
    AsyncInitializable,
    AsyncDisposable,
    ReplayValidator,
    ReplayStorage
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";
import { ReplayReader } from "./replayReader.js";
import { PostgresRepository, type PostgresConfig } from "./postgresRepository.js";
import { ReplayValidatorWASM } from "./validatorWASM.js";
import { S3Storage, type S3Config } from './S3Storage.js';


export interface CloudServiceProviderConfig {
    storage: S3Config,
    repository: PostgresConfig,
}


export class CloudServiceProvider
implements ServiceContainer, AsyncInitializable, AsyncDisposable {
    public reader: ReplayReader;
    private config: CloudServiceProviderConfig;
    private _validator: ReplayValidatorWASM | null;
    private _repository: PostgresRepository | null;
    private _storage: S3Storage | null;

    public constructor(config: CloudServiceProviderConfig) {
        this.config = config;
        this.reader =  new ReplayReader();
        this._validator = null;
        this._repository = null;
        this._storage = null;
    }

    public async initialize(): Promise<void> {
        this._validator = new ReplayValidatorWASM();
        this._repository = new PostgresRepository(this.config.repository);
        this._storage = new S3Storage(this.config.storage);

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

    public async dispose(): Promise<void> {
        await this.repository.dispose();
    }

    public get validator(): ReplayValidator {
        if (this._validator === null) {
            throw new ServiceNotLoadedError('ReplayValidator');
        }

        return this._validator;
    }

    public get repository(): PostgresRepository {
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
