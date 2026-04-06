/** Metadata returned for a binary file stored in Drive */
interface DriveFileEntry {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size: string;
}
/** Progress object passed to the onProgress callback during upload */
interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}
/** Options accepted by create() and update() */
interface UploadOptions {
    onProgress?: (progress: UploadProgress) => void;
}
/** Options when constructing a DriveFiles instance */
interface DriveFilesOptions {
    resumableThreshold?: number;
    onTokenExpired?: () => Promise<string>;
}
/** All possible error codes */
type DriveFilesErrorCode = "NOT_FOUND" | "ALREADY_EXISTS" | "UPLOAD_FAILED" | "AUTH_ERROR" | "API_ERROR";

declare class DriveFiles {
    private token;
    private options;
    cache: Map<string, string>;
    constructor(token: string, options?: DriveFilesOptions);
    setToken(token: string): void;
    create(name: string, blob: Blob | File, options?: UploadOptions): Promise<DriveFileEntry>;
    read(name: string): Promise<Blob>;
    update(name: string, blob: Blob | File, options?: UploadOptions): Promise<DriveFileEntry>;
    delete(name: string): Promise<void>;
    list(prefix?: string): Promise<DriveFileEntry[]>;
    private _uploadFile;
    private _multipartUpload;
    protected _fetch<T = unknown>(url: string, options?: RequestInit, _isRetry?: boolean): Promise<T | null>;
    protected _listAll(prefix?: string): Promise<DriveFileEntry[]>;
    protected _findByName(name: string): Promise<string>;
}

declare class DriveFilesError extends Error {
    code: DriveFilesErrorCode;
    status?: number;
    constructor(message: string, code: DriveFilesErrorCode, status?: number);
}

export { type DriveFileEntry, DriveFiles, DriveFilesError, type DriveFilesErrorCode, type DriveFilesOptions, type UploadOptions, type UploadProgress };
