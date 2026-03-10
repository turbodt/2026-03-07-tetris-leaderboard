import dns from 'node:dns';
import type { AsyncInitializable, ReplayStorage } from "../models.js";
import { ServiceError, ServiceNotLoadedError } from "./errors.js";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ReplayReader } from './replayReader.js';

dns.setDefaultResultOrder('ipv4first');

export class S3StorageError extends ServiceError {
    public constructor(message: string) {
        super('S3Storage', message);
        Object.setPrototypeOf(this, S3StorageError.prototype);
    }
};


export class S3Storage
implements ReplayStorage, AsyncInitializable {
    private readonly bucketName = "tetris-replays";
    private _client: S3Client | null = null;
    private _reader: ReplayReader | null = null;

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

        const configParams = {
            region: 'S3_REGION',
            endpoint: 'S3_ENDPOINT',
            accessKeyId: 'S3_ACCESS_KEY_ID',
            secretAccessKey: 'S3_SECRET_ACCESS_KEY',
        };
        const config = Object.entries(configParams).reduce(
            (acc, [key, paramName]) => {
                return {...acc, [key]: process.env[paramName]};
            },
            {}
        ) as {
            region: string;
            endpoint: string;
            accessKeyId: string;
            secretAccessKey: string;
        };

        const errors = Object.entries(config)
            .filter(([_, value]) => value === undefined)
            .map(([key,_]): S3StorageError =>
                new S3StorageError(`${key} not found`)
            );

        if (errors.length) {
            throw errors[0];
        }

        this._client = new S3Client({
            forcePathStyle: true,
            region: config.region,
            endpoint: config.endpoint,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
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
