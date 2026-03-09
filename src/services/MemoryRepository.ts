import type {
    LeaderboardEntry,
    LeaderboardEntryId,
    ReplayReader,
    ReplayRepository
} from "../models.js";
import { ServiceNotLoadedError } from "./errors.js";


type EntryMap = Map<LeaderboardEntry['timestamp'], Map<string, LeaderboardEntry>>;

export class MemoryRepository
implements ReplayRepository {
    private entries: EntryMap;
    private scoreTable: Array<{score: LeaderboardEntry['score'], id: LeaderboardEntryId}>;
    private _reader: ReplayReader | null = null;

    public constructor() {
        this.entries = new Map();
        this.scoreTable = [];
    }

    async initialize(reader: ReplayReader): Promise<void> {
        this._reader = reader;
    }

    public async save(
        username: string,
        replayData: Uint8Array,
    ): Promise<LeaderboardEntry> {
        const entry = this.extractEntry(username, replayData);
        const id = this.getEntryId(entry);

        const existentEntry = this.getEntry(id);
        this.setEntry(entry);

        if (!existentEntry) {
            this.insertScore(entry.score, id);
        } else {
            // TODO
        };

        return entry;
    };

    public async get(id: LeaderboardEntryId): Promise<LeaderboardEntry | null> {
        const entry = this.getEntry(id);
        if (!entry) {
            return null;
        }
        return entry;
    };


    public async listTopScores(
        limit: number,
    ): Promise<Iterable<LeaderboardEntry>> {
        const topScores = this.scoreTable.slice(0, limit);
        const entries = topScores
            .map(scoreEntry => scoreEntry.id)
            .map(id => this.getEntry(id))
            .filter( (entry): entry is LeaderboardEntry => !!entry);
        return entries;
    };

    private get reader(): ReplayReader {
        if (this._reader === null) {
            throw new ServiceNotLoadedError('ReplayReader');
        }

        return this._reader;
    }

    private insertScore(
        score: LeaderboardEntry['score'],
        id: LeaderboardEntryId,
    ): void {
        let i = 0;
        while (i < this.scoreTable.length) {
            const scoreEntry = this.scoreTable.at(i);
            if (!scoreEntry) {
                break;
            }
            if (scoreEntry.score < score) {
                break;
            }
            i++;
        }
        this.scoreTable.splice(i, 0, {score, id});
    }

    private extractEntry(
        username: string,
        replayData: Uint8Array,
    ): LeaderboardEntry {
        return {
            username,
            timestamp: this.reader.getTimestamp(replayData),
            seed: this.reader.getSeed(replayData),
            version: this.reader.getVersion(replayData),
            score: this.reader.getScore(replayData),
        };
    }

    private getEntryId(entry: LeaderboardEntry): LeaderboardEntryId {
        return {username: entry.username, timestamp: entry.timestamp};
    }

    private getEntry(
        {username, timestamp}: LeaderboardEntryId,
    ): LeaderboardEntry | undefined {
        return this.entries.get(timestamp)?.get(username);
    }

    private setEntry(entry: LeaderboardEntry,): EntryMap {
        const m1 = this.entries.get(entry.timestamp);

        if (m1 === undefined) {
            const m2 = new Map<string, LeaderboardEntry>();
            m2.set(entry.username, entry);
            this.entries.set(entry.timestamp, m2);
        } else {
            m1.set(entry.username, entry);
        }

        return this.entries;
    }
}
