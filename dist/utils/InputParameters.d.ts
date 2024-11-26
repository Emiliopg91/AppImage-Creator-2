export declare class InputParameters {
    name: string;
    version: string;
    entrypoint: string;
    icon: string;
    desktop: string;
    constructor(name: string, version: string, entrypoint: string, icon: string, desktop: string);
    static fromDesktopFile(): InputParameters;
    static runCommand(command: string): string;
    static findDesktopFile(): string;
}
