export interface LeaderboardEntry {
    username: string;
    timestamp: number;
    seed: number;
    version: number;
    score: number;
    filepath: string;
};


export interface LeaderboardEntryReturn {
    username: string;
    score: number;
    timestamp: number;
};


export interface LeaderboardEntryId {
    seed: number;
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
    save(entry: LeaderboardEntry): Promise<LeaderboardEntry>;
    get(id: LeaderboardEntryId): Promise<LeaderboardEntry | null>;
    listTopScores(limit: number): Promise<Iterable<LeaderboardEntry>>;
};


export interface ReplayStorage {
    getHashFilepath(replayData: Uint8Array): string;
    save(filepath: string, replayData: Uint8Array): Promise<void>;
    get(filepath: string): Promise<Uint8Array>;
    remove(filepath: string): Promise<void>;
};


export interface ServiceContainer {
    get reader(): ReplayReader;
    get validator(): ReplayValidator;
    get repository(): ReplayRepository;
    get storage(): ReplayStorage;
}


export interface AsyncInitializable {
    initialize(...args: any[]): Promise<void>;
}


export interface AsyncDisposable {
    dispose(...args: any[]): Promise<void>;
}
