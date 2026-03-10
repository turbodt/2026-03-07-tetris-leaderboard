import { AlreadyExistsError } from "../errors.js";
import type {
    LeaderboardEntry,
    LeaderboardEntryId,
    ReplayRepository
} from "../models.js";


type EntryMap = Map<LeaderboardEntry['timestamp'], Map<LeaderboardEntry['seed'], LeaderboardEntry>>;

export class MemoryRepository
implements ReplayRepository {
    private entries: EntryMap;
    private scoreTable: Array<{score: LeaderboardEntry['score'], id: LeaderboardEntryId}>;

    public constructor() {
        this.entries = new Map();
        this.scoreTable = [];
    }

    public async save(entry: LeaderboardEntry): Promise<LeaderboardEntry> {
        const id = this.getEntryId(entry);

        const existentEntry = this.getEntry(id);
        this.setEntry(entry);

        if (existentEntry !== null) {
            throw new AlreadyExistsError(
                `seed=${id.seed} and timestamp=${id.timestamp}`
            );
        }
        ;
        this.insertScore(entry.score, id);

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

    private getEntryId(entry: LeaderboardEntry): LeaderboardEntryId {
        return {seed: entry.seed, timestamp: entry.timestamp};
    }

    private getEntry(
        {seed, timestamp}: LeaderboardEntryId,
    ): LeaderboardEntry | undefined {
        return this.entries.get(timestamp)?.get(seed);
    }

    private setEntry(entry: LeaderboardEntry,): EntryMap {
        const m1 = this.entries.get(entry.timestamp);

        if (m1 === undefined) {
            const m2 = new Map<number, LeaderboardEntry>();
            m2.set(entry.seed, entry);
            this.entries.set(entry.timestamp, m2);
        } else {
            m1.set(entry.seed, entry);
        }

        return this.entries;
    }
}
