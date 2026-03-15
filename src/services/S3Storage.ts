import dns from 'node:dns';
import type { AsyncInitializable, ReplayStorage } from "../models.js";
import { ServiceError, ServiceNotLoadedError } from "./errors.js";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ReplayReader } from './replayReader.js';


dns.setDefaultResultOrder('ipv4first');


export interface S3Config {
    region: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
}


export class S3StorageError extends ServiceError {
    public constructor(message: string) {
        super('S3Storage', message);
        Object.setPrototypeOf(this, S3StorageError.prototype);
    }
};


export class S3Storage
implements ReplayStorage, AsyncInitializable {
    private config: S3Config;
    private readonly bucketName = "tetris-replays";
    private _client: S3Client | null = null;
    private _reader: ReplayReader | null = null;

    public constructor(config: S3Config) {
        this.config = config;
    }

    public getHashFilepath(replayData: Uint8Array): string {
        const majorVersion = this.reader.getVersion(replayData) >> 24;
        const ts = this.reader.getTimestamp(replayData);
        const seed = this.reader.getSeed(replayData);
        const size = replayData.byteLength;
        return `v${majorVersion}/${ts}_${seed}_${size}.replay`;
    }

    public async save(filepath: string, replayData: Uint8Array): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: filepath,
                Body: replayData,
                ContentType: "application/octet-stream",
            })
        );
    }

    public async get(filepath: string): Promise<Uint8Array> {
        const response = await this.client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: filepath,
        }));
        return await response.Body!.transformToByteArray();
    }

    public async remove(filepath: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: filepath,
        }));
    }

    public async initialize(reader: ReplayReader): Promise<void> {
        this._reader = reader;

        this._client = new S3Client({
            forcePathStyle: true,
            region: this.config.region,
            endpoint: this.config.endpoint,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
            }
        });
    }

    private get client(): S3Client {
        if (this._client === null) {
            throw new ServiceNotLoadedError('S3Client');
        }
        return this._client;
    }

    private get reader(): ReplayReader {
        if (this._reader === null) {
            throw new ServiceNotLoadedError('ReplayReader');
        }

        return this._reader;
    }
}
