import type { LeaderboardEntry, LeaderboardEntryReturn } from "./models.js";


function transformEntry(entry: LeaderboardEntry): LeaderboardEntryReturn {
    return {
        username: entry.username,
        score: entry.score,
        timestamp: entry.timestamp,
    };
}

function transformEntries(
    entries: Iterable<LeaderboardEntry>
): Array<LeaderboardEntryReturn> {
    return Array.from(entries).map(transformEntry);
}



export function serialize(entry: LeaderboardEntry): LeaderboardEntryReturn;
export function serialize(entries: Iterable<LeaderboardEntry>): Array<LeaderboardEntryReturn>;


export function serialize(data: any): any {
    if (data instanceof Array) {
        return transformEntries(data);
    }

    return transformEntry(data);
}
