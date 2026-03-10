import postgres from "postgres";
import type {
    AsyncInitializable,
    LeaderboardEntry,
    LeaderboardEntryId,
    ReplayReader,
    ReplayRepository,
} from "../models.js";
import { ServiceError, ServiceNotLoadedError } from "./errors.js";


export class PostgresRepositoryError extends ServiceError {
    public constructor(message: string) {
        super('PostgresRepository', message);
        Object.setPrototypeOf(this, PostgresRepositoryError.prototype);
    }
};


interface DBRow {
    username: string;
    timestamp: number;
    seed: number;
    version: number;
    score: number;
    ts: number;
    filepath: string;
};


export class PostgresRepository
implements ReplayRepository, AsyncInitializable {
    private _sql: postgres.Sql | null = null;

    async save(entry: LeaderboardEntry): Promise<LeaderboardEntry> {
        const {username, score, seed, version, filepath, timestamp } = entry;

        try {
            const [row] = await this.sql<DBRow[]>`
                INSERT INTO replays (username, score, seed, version, ts, filepath)
                VALUES (${username}, ${score}, ${seed}, ${version}, ${timestamp}, ${filepath})
                RETURNING username, score, seed, version, ts
            `;

            return {
                username: row.username,
                score: row.score,
                seed: Number(row.seed),
                version: Number(row.version),
                filepath: row.filepath,
                timestamp: new Date(row.ts).getTime()
            };
        } catch (err: any) {
            throw new PostgresRepositoryError(`Database error: ${err.message}`);
        }
    }

    async listTopScores(limit: number): Promise<Iterable<LeaderboardEntry>> {
        const rows: DBRow[] = await this.sql<DBRow[]>`
            SELECT username, score, seed, version, ts
            FROM replays
            ORDER BY score DESC
            LIMIT ${limit}
        `;

        return rows.map(row => ({
            username: row.username,
            score: row.score,
            seed: Number(row.seed),
            version: Number(row.version),
            filepath: row.filepath,
            timestamp: new Date(row.ts).getTime()
        }));
    }

    async get(_id: LeaderboardEntryId): Promise<LeaderboardEntry | null> {
        return null;
    }

    public async initialize(): Promise<void> {
        const configParams = {
            name: 'DATABASE_NAME',
            user: 'DATABASE_USER',
            password: 'DATABASE_PASSWORD',
            port: 'DATABASE_PORT',
            host: 'DATABASE_HOST',
        };
        const config = Object.entries(configParams).reduce(
            (acc, [key, paramName]) => {
                return {...acc, [key]: process.env[paramName]};
            },
            {}
        ) as {
            name: string;
            user: string;
            password: string;
            port: string;
            host: string;
        };

        const errors = Object.entries(config)
            .filter(([_, value]) => value === undefined)
            .map(([key,_]): PostgresRepositoryError =>
                new PostgresRepositoryError(`${key} not found`)
            );

        if (errors.length) {
            throw errors[0];
        }

        const url = `postgresql://`
            + `${config.user}:${config.password}`
            + `@${config.host}:${config.port}/${config.name}`;

        console.log(`Connecting to ${url}`);
        this._sql = postgres(url, {
            prepare: true,
        });
    }

    private get sql(): postgres.Sql {
        if (this._sql === null) {
            throw new ServiceNotLoadedError('PostgresClient');
        }

        return this._sql;
    }
}
