export declare class DesktopParser {
    data: {
        [key: string]: {
            [key: string]: string;
        };
    };
    constructor(filePath: string);
    persist(filePath: string): void;
}
