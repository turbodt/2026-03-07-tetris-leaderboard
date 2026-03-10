import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AsyncInitializable, ReplayReader, ReplayStorage } from '../models.js';
import { ServiceNotLoadedError } from './errors.js';

export class LocalStorage
implements ReplayStorage, AsyncInitializable {
    private readonly baseDir = '/tmp/tetris-replays/';
    private _reader: ReplayReader | null = null;

    getHashFilepath(replayData: Uint8Array): string {
        const seed = this.reader.getSeed(replayData);
        const ts = this.reader.getTimestamp(replayData);
        const size = replayData.length;

        return join(this.baseDir, `${seed}_${ts}_${size}.replay`);
    }

    async save(filepath: string, replayData: Uint8Array): Promise<void> {
        const fullPath = filepath;
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, replayData);
    }

    async get(filepath: string): Promise<Uint8Array> {
        const fullPath = join(this.baseDir, filepath);
        const buffer = await readFile(fullPath);
        return new Uint8Array(buffer);
    }

    async remove(filepath: string): Promise<void> {
        const fullPath = join(this.baseDir, filepath);
        await unlink(fullPath);
    }

    public async initialize(reader: ReplayReader): Promise<void> {
        this._reader = reader;
    }

    private get reader(): ReplayReader {
        if (this._reader === null) {
            throw new ServiceNotLoadedError('ReplayReader');
        }

        return this._reader;
    }
}
