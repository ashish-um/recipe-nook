interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
    size: string;
}
interface DriveCRUDOptions {
    appSpace?: "appDataFolder" | "drive";
    rootFolderName?: string;
    onTokenExpired?: () => Promise<string>;
}
type DriveErrorCode = "NOT_FOUND" | "ALREADY_EXISTS" | "INVALID_TYPE" | "AUTH_ERROR" | "API_ERROR";

declare class DriveCRUD {
    private token;
    private options;
    cache: Map<string, string>;
    constructor(token: string, options?: DriveCRUDOptions);
    setToken(token: string): void;
    create(name: string, data: unknown): Promise<DriveFile>;
    read<T = unknown>(name: string): Promise<T>;
    update(name: string, data: unknown): Promise<DriveFile>;
    delete(name: string): Promise<void>;
    list(prefix?: string): Promise<DriveFile[]>;
    protected _fetch<T = unknown>(url: string, options?: RequestInit, _isRetry?: boolean): Promise<T | null>;
    protected _listAll(prefix?: string): Promise<DriveFile[]>;
    protected _findByName(name: string): Promise<string>;
}

declare class DriveError extends Error {
    code: DriveErrorCode;
    status?: number;
    constructor(message: string, code: DriveErrorCode, status?: number);
}

export { DriveCRUD, type DriveCRUDOptions, DriveError, type DriveErrorCode, type DriveFile };
