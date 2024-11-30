export declare class AppImageTool {
    actionDir: string;
    outDir: string;
    actualOutDir: string;
    appimagetoolPath: string;
    apprunLocalFile: string;
    autoupLocalFile: string;
    tmpPath: string;
    apprunFile: string;
    autoupFolder: string;
    autoupFile: string;
    constructor();
    createResources(name: string, version: string, icon: string, entrypoint: string, desktopPath: string): void;
    createAppImage(name: string, version: string, directory?: string): Promise<void>;
    extractAppImage(file: string): Promise<void>;
    getReleaseDate(path: string): string;
    getSha512(path: string): string;
}
