import type { ReplayReader as IReplayReader, } from '../models.js';


export class ReplayReader implements IReplayReader {

    public getVersion(replayData: Uint8Array): number {
        return new DataView(replayData.buffer).getUint32(0, false);
    };

    public getVersionString(replayData: Uint8Array): string {
        const number = this.getVersion(replayData);
        return `${number>>24}.${0xFF & (number >> 16)}.${0xFFFF & number}`;

    };

    public getSeed(replayData: Uint8Array): number {
        return new DataView(replayData.buffer).getUint32(4, false);
    }

    public getScore(replayData: Uint8Array): number {
        return new DataView(replayData.buffer).getUint32(8, false);
    };

    public getTimestamp(replayData: Uint8Array): number {
        return Number(new DataView(replayData.buffer).getBigUint64(28, false));
    };
}
