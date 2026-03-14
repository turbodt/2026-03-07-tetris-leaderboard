import postgres from "postgres";
import type {
    AsyncDisposable,
    AsyncInitializable,
    LeaderboardEntry,
    LeaderboardEntryId,
    ReplayRepository,
} from "../models.js";
import { ServiceError, ServiceNotLoadedError } from "./errors.js";
import { AlreadyExistsError, NotUniqueError } from "../errors.js";


export interface PostgresConfig {
    connectionString: string;
};


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
implements ReplayRepository, AsyncInitializable, AsyncDisposable {
    private config: PostgresConfig;
    private _sql: postgres.Sql | null = null;

    public constructor(config: PostgresConfig) {
        this.config = config;
    }

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
        console.log(`Connecting to ${this.config.connectionString}`);
        this._sql = postgres(this.config.connectionString, {
            prepare: false,
            ssl: 'require',
            max: 1,
        });
    }

    public async dispose(): Promise<void> {
        await this.sql.end();
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
