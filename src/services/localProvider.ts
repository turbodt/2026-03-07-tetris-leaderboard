import type {
    ServiceContainer,
    AsyncInitializable,
    ReplayValidator,
    ReplayRepository,
    ReplayStorage
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";
import { LocalStorage } from "./LocalStorage.js";
import { MemoryRepository } from "./MemoryRepository.js";
import { ReplayReader } from "./replayReader.js";
import { ReplayValidatorWASM } from "./validatorWASM.js";



export class LocalServiceProvider
implements ServiceContainer, AsyncInitializable {
    public reader: ReplayReader;
    private _validator: ReplayValidatorWASM | null;
    private _repository: MemoryRepository | null;
    private _storage: LocalStorage | null;

    public constructor() {
        this.reader =  new ReplayReader();
        this._validator = null;
        this._repository = null;
        this._storage = null;
    }

    public async initialize(): Promise<void> {
        this._validator = new ReplayValidatorWASM();
        this._repository = new MemoryRepository();
        this._storage = new LocalStorage();

        console.log('✅ Memory repository ready.');

        await this._validator.initialize(this.reader).then(() => {
            console.log('✅ Validador WASM ready.');
        });
        await this._storage.initialize(this.reader).then(() => {
            console.log('✅ Local storage ready.');
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
