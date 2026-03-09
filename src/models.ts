export interface LeaderboardEntry {
    username: string;
    timestamp: bigint;
    seed: number;
    version: number;
    position: number;
    score: number;
};


export interface LeaderboardEntryId {
    username: string;
    timestamp: bigint;
};


export interface ReplayReader {
    getVersion(replayData: Uint8Array): number;
    getVersionString(replayData: Uint8Array): string;
    getSeed(replayData: Uint8Array): number;
    getScore(replayData: Uint8Array): number;
    getTimestamp(replayData: Uint8Array): bigint;
};


export interface ReplayValidator {
    validate(replayData: Uint8Array): boolean;
};


export interface ReplayRepository {
    save(replayData: Uint8Array): Promise<LeaderboardEntry>;
    get(id: LeaderboardEntryId): Promise<LeaderboardEntry>;
    listTopScores(limit: number): Promise<Iterable<LeaderboardEntry>>;
};


export interface ServiceContainer {
    get validator(): ReplayValidator;
}


export interface AsyncInitializable {
    initialize(...args: any[]): Promise<void>;
}
