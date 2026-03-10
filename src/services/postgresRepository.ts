import postgres from "postgres";
import type {
    AsyncInitializable,
    LeaderboardEntry,
    LeaderboardEntryId,
    ReplayRepository,
} from "../models.js";
import { ServiceError, ServiceNotLoadedError } from "./errors.js";
import { AlreadyExistsError, NotUniqueError } from "../errors.js";


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
        const entryId: LeaderboardEntryId = this.getEntryId(entry);

        if (await this.has(entryId)) {
            throw new AlreadyExistsError(
                `seed=${entryId.seed} and timestamp=${entryId.timestamp}`
            );
        }

        const {username, score, seed, version, filepath, timestamp } = entry;

        try {
            const [row] = await this.sql<DBRow[]>`
                INSERT INTO replays (username, score, seed, version, ts, filepath)
                VALUES (${username}, ${score}, ${seed}, ${version}, ${timestamp}, ${filepath})
                RETURNING username, score, seed, version, ts, filepath
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
            SELECT username, score, seed, version, ts, filepath
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

    async get(id: LeaderboardEntryId): Promise<LeaderboardEntry | null> {
        const rows: DBRow[] = await this.sql<DBRow[]>`
            SELECT username, score, seed, version, ts, filepath
            FROM replays
            WHERE seed = ${id.seed}
                AND ts = TO_TIMESTAMP(${id.timestamp/1000})
        `;

        switch (rows.length) {
            case 0:
                return null;
            case 1:
                break;
            default:
                throw new NotUniqueError(`entry`);
        };

        const row = rows[0];

        return {
            username: row.username,
            score: row.score,
            seed: Number(row.seed),
            version: Number(row.version),
            filepath: row.filepath,
            timestamp: new Date(row.ts).getTime()
        };
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

    private async has(id: LeaderboardEntryId): Promise<boolean> {
        const entry = await this.get(id);
        return entry !== null;
    }

    private getEntryId(entry: LeaderboardEntry): LeaderboardEntryId {
        return {seed: entry.seed, timestamp: entry.timestamp};
    }

    private get sql(): postgres.Sql {
        if (this._sql === null) {
            throw new ServiceNotLoadedError('PostgresClient');
        }

        return this._sql;
    }
}
