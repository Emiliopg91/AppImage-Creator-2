/// <reference types="node" />
/// <reference types="node" />
import { AxiosInstance } from 'axios';
export declare class MSync {
    static readonly blockSize: number;
    name: string;
    size: number;
    hash: string;
    blocks: string[];
    url?: string;
    constructor(name: string, size: number, hash: string, blocks: string[], url?: string);
    toFile(filePath: string): void;
    patch(filePath: string, binaryUrl?: string, overwrite?: boolean): Promise<void>;
    static fromUrl: (url: string) => Promise<MSync>;
    static fromFile: (filePath: string) => MSync;
    static fromBinary: (filePath: string) => MSync;
    static getFileBlocks: (filePath: string) => string[];
    static calculateBlockHash: (block: Buffer) => string;
    static calculateFileHash: (filePath: string) => string;
    static downloadChunk: (session: AxiosInstance, start: number, end: number, url: string) => Promise<Buffer>;
    static groupBlocks: (fileSize: number, changedBlocks: number[]) => [number, number][];
    static formatBytes: (size: number) => string;
}
