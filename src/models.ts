export interface LeaderboardEntry {
    username: string;
    timestamp: number;
    seed: number;
    version: number;
    score: number;
};


export interface LeaderboardEntryReturn {
    username: string;
    score: number;
    timestamp: number;
};


export interface LeaderboardEntryId {
    username: string;
    timestamp: number;
};


export interface ReplayReader {
    getVersion(replayData: Uint8Array): number;
    getVersionString(replayData: Uint8Array): string;
    getSeed(replayData: Uint8Array): number;
    getScore(replayData: Uint8Array): number;
    getTimestamp(replayData: Uint8Array): number;
};


export interface ReplayValidator {
    validate(replayData: Uint8Array): boolean;
};


export interface ReplayRepository {
    save(username: string, replayData: Uint8Array): Promise<LeaderboardEntry>;
    get(id: LeaderboardEntryId): Promise<LeaderboardEntry | null>;
    listTopScores(limit: number): Promise<Iterable<LeaderboardEntry>>;
};


export interface ServiceContainer {
    get reader(): ReplayReader;
    get validator(): ReplayValidator;
    get repository(): ReplayRepository;
}


export interface AsyncInitializable {
    initialize(...args: any[]): Promise<void>;
}
