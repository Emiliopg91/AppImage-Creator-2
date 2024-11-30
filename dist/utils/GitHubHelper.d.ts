import { GitHub } from '@actions/github/lib/utils';
export declare class GitHubHelper {
    static repository: string;
    static owner: string;
    static workspacePath: string;
    static octokit: InstanceType<typeof GitHub> | undefined;
    static baseParams: {
        repo: string;
        owner: string;
    };
    static latestUrl: string;
    static git: import("simple-git").SimpleGit;
    static initialize(): Promise<void>;
    static getLatestVersion(): Promise<string | undefined>;
    static checkUpdateRequired(newVersion: string): Promise<boolean>;
    static deleteRelease(tag: string): Promise<void>;
    static stashPath(path: string): Promise<void>;
    static commit(message: string): Promise<void>;
    static push(): Promise<void>;
    static deleteTag(tag: string): Promise<void>;
    static createTag(tag: string): Promise<void>;
    static getDefaultBranchSha(): Promise<string>;
    static createRelease(tag: string): Promise<void>;
    static incrementVersion(version: string): string;
}
