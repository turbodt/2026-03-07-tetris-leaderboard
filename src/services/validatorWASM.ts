import { AppError } from '../errors.js';
import type { AsyncInitializable, ReplayReader, ReplayValidator } from '../models.js';
import { ServiceNotLoadedError } from './errors.js';


export interface ValidatorWASMConfig {
    versions: string[];
    loader(v:string): Promise<WebAssembly.Instance>;
};


type WasmPtr = number;

export class ValidationError extends AppError {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
};


export class ReplayValidatorWASM
implements ReplayValidator, AsyncInitializable {
    private config: ValidatorWASMConfig;
    private _reader: ReplayReader | null = null;
    private engines = new Map<string, { instance: WebAssembly.Instance; exports: any }>();

    public constructor(config: ValidatorWASMConfig) {
        this.config = config;
    }

    async initialize(reader: ReplayReader): Promise<void> {
        this._reader = reader;

        const instances = this.config.versions
        .map(async (version): Promise<[WebAssembly.Instance, string]> => {
            const instance = await this.config.loader(version);
            return [instance, version];
        });

        (await Promise.all(instances))
            .forEach(([instance, version]) => {
                this.engines.set(
                    version,
                    {instance, exports: instance.exports}
                );
            });
    }


    public validate(replayData: Uint8Array): boolean {
        const version = this.reader.getVersionString(replayData);
        const engine = this.engines.get(version);
        if (!engine) {
            throw new ValidationError(`Unknown version ${version}.`);
        }

        const exports = engine.exports;
        const size = replayData.length;

        const memPtr = this.writeIntoWasmBuff(replayData);
        const replayPtr = exports.replay_mem_read(memPtr, size);
        exports.free(memPtr);

        if (replayPtr === 0) {
            throw new ValidationError("Couldn't read replay");
        }

        const result = exports.replay_validate(replayPtr);
        exports.free(replayPtr);

        return result === 0;
    }

    private writeIntoWasmBuff(replayData: Uint8Array): WasmPtr {
        const version = this.reader.getVersionString(replayData);
        const engine = this.engines.get(version);
        if (!engine) {
            throw new ValidationError(`Unknown version ${version}.`);
        }

        const exports = engine.exports;
        const size = replayData.length;


        const ptr: WasmPtr = exports.malloc(size);
        if (ptr === 0) {
            throw new ValidationError("Couldn't alloc file contents in WASM memory");
        }

        const memory = new Uint8Array(exports.memory.buffer);
        memory.set(replayData, ptr);

        return ptr;
    }

    private get reader(): ReplayReader {
        if (this._reader === null) {
            throw new ServiceNotLoadedError('ReplayReader');
        }

        return this._reader;
    }
}
