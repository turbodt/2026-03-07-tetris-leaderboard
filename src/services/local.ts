import type {
    ServiceContainer,
    AsyncInitializable,
    ReplayValidator
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";
import { ReplayReader } from "./replayReader.js";
import { ReplayValidatorWASM } from "./validatorWASM.js";



export class LocalServiceProvider
implements ServiceContainer, AsyncInitializable {
    public reader: ReplayReader;
    private _validator: ReplayValidatorWASM | null;

    public constructor() {
        this.reader =  new ReplayReader();
        this._validator = null;
    }

    public async initialize(): Promise<void> {
        this._validator = new ReplayValidatorWASM();

        await this._validator.initialize(this.reader).then(() => {
            console.log('✅ Validador WASM ready.');
        });
    };

    public get validator(): ReplayValidator {
        if (this._validator === null) {
            throw new ServiceNotLoadedError('ReplayValidator');
        }

        return this._validator;
    }
};
