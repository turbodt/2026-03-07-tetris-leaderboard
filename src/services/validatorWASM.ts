import { WASI } from 'node:wasi';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../base.js';
import type { AsyncInitializable, ReplayReader, ReplayValidator } from '../models.js';
import { ServiceNotLoadedError } from './errors.js';


type WasmPtr = number;
const ASSETS_DIR = './assets';

export class ValidationError extends AppError {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
};


export class ReplayValidatorWASM
implements ReplayValidator, AsyncInitializable {
    private _reader: ReplayReader | null = null;
    private engines = new Map<string, { instance: WebAssembly.Instance; exports: any }>();

    async initialize(reader: ReplayReader): Promise<void> {
        this._reader = reader;
        const filenames = fs.readdirSync(ASSETS_DIR);

        const instances = filenames
            .map((filename): [string, RegExpMatchArray | null] => ([
                filename,
                filename.match(/test-v?([\d\.]+)\.wasm/)
            ]))
            .filter((arr): arr is [string, RegExpMatchArray] => arr[1] !== null)
            .map(([filename, match]: [string, RegExpMatchArray]) => ([filename, match[1]]))
            .map(async ([filename, version]): Promise<[WebAssembly.Instance, string]> => {
                return this.loadWasmEngine(filename).then(
                    instance => ([instance, version])
                    );
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

    private async loadWasmEngine(filename: string): Promise<WebAssembly.Instance> {
        const wasi = new WASI({ version: 'preview1' });
        const wasmBuffer = fs.readFileSync(path.join(ASSETS_DIR, filename));

        const { instance } = await WebAssembly.instantiate(wasmBuffer, {
            wasi_snapshot_preview1: wasi.wasiImport,
        });

        if ((instance.exports as any)._initialize) {
            (instance.exports as any)._initialize();
        } else {
            wasi.initialize(instance);
        }

        return instance;
    }

    private get reader(): ReplayReader {
        if (this._reader === null) {
            throw new ServiceNotLoadedError('ReplayReader');
        }

        return this._reader;
    }
}
