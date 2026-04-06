"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/DriveFilesError.ts
var DriveFilesError;
var init_DriveFilesError = __esm({
  "src/DriveFilesError.ts"() {
    "use strict";
    DriveFilesError = class _DriveFilesError extends Error {
      code;
      status;
      constructor(message, code, status) {
        super(message);
        this.name = "DriveFilesError";
        this.code = code;
        this.status = status;
        Object.setPrototypeOf(this, _DriveFilesError.prototype);
      }
    };
  }
});

// src/utils/xhrUpload.ts
function xhrUpload(options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url);
    for (const [key, value] of Object.entries(options.headers)) {
      xhr.setRequestHeader(key, value);
    }
    if (options.onProgress) {
      const callback = options.onProgress;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          callback({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round(event.loaded / event.total * 100)
          });
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(
            new DriveFilesError(
              "Invalid JSON response from upload",
              "API_ERROR",
              xhr.status
            )
          );
        }
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject(
          new DriveFilesError(
            xhr.statusText || "Authentication failed",
            "AUTH_ERROR",
            xhr.status
          )
        );
      } else {
        reject(
          new DriveFilesError(
            xhr.statusText || "Upload failed",
            "UPLOAD_FAILED",
            xhr.status
          )
        );
      }
    };
    xhr.onerror = () => {
      reject(new DriveFilesError("Upload failed: network error", "UPLOAD_FAILED"));
    };
    xhr.send(options.body);
  });
}
var init_xhrUpload = __esm({
  "src/utils/xhrUpload.ts"() {
    "use strict";
    init_DriveFilesError();
  }
});

// src/utils/resumableUpload.ts
var resumableUpload_exports = {};
__export(resumableUpload_exports, {
  resumableUpload: () => resumableUpload
});
async function resumableUpload(options) {
  const { method, metadata, blob, token, fileId, onProgress } = options;
  const mimeType = blob.type || "application/octet-stream";
  const size = blob.size;
  const baseUrl = fileId ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}` : "https://www.googleapis.com/upload/drive/v3/files";
  const initUrl = `${baseUrl}?uploadType=resumable&fields=id,name,mimeType,modifiedTime,size`;
  const initHeaders = new Headers();
  initHeaders.set("Authorization", `Bearer ${token}`);
  initHeaders.set("Content-Type", "application/json");
  initHeaders.set("X-Upload-Content-Type", mimeType);
  initHeaders.set("X-Upload-Content-Length", size.toString());
  const initRes = await fetch(initUrl, {
    method,
    headers: initHeaders,
    body: JSON.stringify(metadata)
  });
  if (!initRes.ok) {
    if (initRes.status === 401 || initRes.status === 403) {
      throw new DriveFilesError(initRes.statusText, "AUTH_ERROR", initRes.status);
    }
    throw new DriveFilesError(
      `Failed to initiate resumable upload session: ${initRes.statusText}`,
      "API_ERROR",
      initRes.status
    );
  }
  const sessionUrl = initRes.headers.get("Location");
  if (!sessionUrl) {
    throw new DriveFilesError("No Location header returned from resumable upload initiation", "API_ERROR");
  }
  let start = 0;
  let finalResult = null;
  const blobBuffer = await blob.arrayBuffer();
  while (start < size) {
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, size);
    const isFinalChunk = end === size;
    const chunk = blobBuffer.slice(start, end);
    const contentRange = `bytes ${start}-${end - 1}/${size}`;
    let chunkResult;
    try {
      chunkResult = await xhrUpload({
        url: sessionUrl,
        method: "PUT",
        headers: {
          "Content-Range": contentRange
        },
        body: chunk,
        onProgress: (chunkProgress) => {
          if (onProgress) {
            const totalLoaded = start + chunkProgress.loaded;
            onProgress({
              loaded: totalLoaded,
              total: size,
              percent: Math.round(totalLoaded / size * 100)
            });
          }
        }
      });
      if (isFinalChunk) {
        finalResult = chunkResult;
      }
    } catch (err) {
      if (err instanceof DriveFilesError && err.status === 308) {
      } else {
        throw err;
      }
    }
    start = end;
  }
  if (!finalResult) {
    throw new DriveFilesError("Upload finished but no file metadata was returned", "UPLOAD_FAILED");
  }
  return finalResult;
}
var CHUNK_SIZE, UPLOAD_CHUNK_SIZE;
var init_resumableUpload = __esm({
  "src/utils/resumableUpload.ts"() {
    "use strict";
    init_DriveFilesError();
    init_xhrUpload();
    CHUNK_SIZE = 256 * 1024;
    UPLOAD_CHUNK_SIZE = CHUNK_SIZE * 4;
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DriveFiles: () => DriveFiles,
  DriveFilesError: () => DriveFilesError
});
module.exports = __toCommonJS(index_exports);

// src/DriveFiles.ts
init_DriveFilesError();

// src/utils/buildMultipartBody.ts
async function buildBinaryMultipartBody(metadata, blob) {
  const boundary = "nook_files_boundary_" + Date.now();
  const mimeType = blob.type || "application/octet-stream";
  const metaPart = `--${boundary}\r
Content-Type: application/json\r
\r
${JSON.stringify(metadata)}\r
`;
  const binaryHeader = `--${boundary}\r
Content-Type: ${mimeType}\r
\r
`;
  const closing = `\r
--${boundary}--`;
  const metaBytes = new TextEncoder().encode(metaPart);
  const headerBytes = new TextEncoder().encode(binaryHeader);
  const binaryBytes = new Uint8Array(await blob.arrayBuffer());
  const closingBytes = new TextEncoder().encode(closing);
  const totalLength = metaBytes.length + headerBytes.length + binaryBytes.length + closingBytes.length;
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of [metaBytes, headerBytes, binaryBytes, closingBytes]) {
    body.set(part, offset);
    offset += part.length;
  }
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

// src/DriveFiles.ts
init_xhrUpload();
var DriveFiles = class {
  token;
  options;
  cache = /* @__PURE__ */ new Map();
  constructor(token, options = {}) {
    this.token = token;
    this.options = {
      resumableThreshold: 5e6,
      ...options
    };
  }
  setToken(token) {
    this.token = token;
  }
  // ── Public CRUD methods ───────────────────────────────────────────
  async create(name, blob, options) {
    try {
      await this._findByName(name);
      throw new DriveFilesError(`File already exists: ${name}`, "ALREADY_EXISTS");
    } catch (e) {
      if (e.code === "ALREADY_EXISTS") throw e;
      if (e.code !== "NOT_FOUND") throw e;
    }
    const metadata = { name, parents: ["appDataFolder"] };
    return this._uploadFile("POST", void 0, metadata, blob, options);
  }
  async read(name) {
    const id = await this._findByName(name);
    const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${this.token}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if ((res.status === 401 || res.status === 403) && this.options.onTokenExpired) {
        const newToken = await this.options.onTokenExpired();
        this.setToken(newToken);
        return this.read(name);
      }
      switch (res.status) {
        case 401:
        case 403:
          throw new DriveFilesError(res.statusText, "AUTH_ERROR", res.status);
        case 404:
          throw new DriveFilesError(`File not found: ${name}`, "NOT_FOUND", res.status);
        default:
          throw new DriveFilesError(res.statusText, "API_ERROR", res.status);
      }
    }
    return await res.blob();
  }
  async update(name, blob, options) {
    const id = await this._findByName(name);
    const metadata = { name };
    return this._uploadFile("PATCH", id, metadata, blob, options);
  }
  async delete(name) {
    const id = await this._findByName(name);
    const url = `https://www.googleapis.com/drive/v3/files/${id}`;
    await this._fetch(url, { method: "DELETE" });
    this.cache.delete(name);
  }
  async list(prefix) {
    return this._listAll(prefix);
  }
  // ── Upload helper ─────────────────────────────────────────────────
  async _uploadFile(method, fileId, metadata, blob, options) {
    if (blob.size >= this.options.resumableThreshold) {
      const { resumableUpload: resumableUpload2 } = await Promise.resolve().then(() => (init_resumableUpload(), resumableUpload_exports));
      return resumableUpload2({
        fileName: metadata.name,
        method,
        metadata,
        blob,
        token: this.token,
        fileId,
        onProgress: options?.onProgress
      });
    }
    return this._multipartUpload(method, fileId, metadata, blob, options);
  }
  async _multipartUpload(method, fileId, metadata, blob, options) {
    const { body, contentType } = await buildBinaryMultipartBody(metadata, blob);
    const baseUrl = fileId ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}` : "https://www.googleapis.com/upload/drive/v3/files";
    const url = `${baseUrl}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size`;
    const file = await xhrUpload({
      url,
      method,
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${this.token}`
      },
      body: body.buffer,
      onProgress: options?.onProgress
    });
    if (!file) {
      throw new DriveFilesError("Failed to upload file", "API_ERROR");
    }
    this.cache.set(file.name, file.id);
    return file;
  }
  async _fetch(url, options = {}, _isRetry = false) {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${this.token}`);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 204) {
      return null;
    }
    if (!res.ok) {
      if ((res.status === 401 || res.status === 403) && !_isRetry && this.options.onTokenExpired) {
        const newToken = await this.options.onTokenExpired();
        this.setToken(newToken);
        return this._fetch(url, options, true);
      }
      let message = res.statusText;
      try {
        const errorData = await res.json();
        if (errorData.error && errorData.error.message) {
          message = errorData.error.message;
        }
      } catch {
      }
      switch (res.status) {
        case 401:
        case 403:
          throw new DriveFilesError(message, "AUTH_ERROR", res.status);
        case 404:
          throw new DriveFilesError(message, "NOT_FOUND", res.status);
        default:
          throw new DriveFilesError(message, "API_ERROR", res.status);
      }
    }
    try {
      return await res.json();
    } catch {
      throw new DriveFilesError("Invalid JSON response", "API_ERROR", res.status);
    }
  }
  async _listAll(prefix) {
    const params = new URLSearchParams({
      fields: "files(id,name,mimeType,modifiedTime,size)",
      pageSize: "1000"
    });
    params.append("spaces", "appDataFolder");
    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const data = await this._fetch(url);
    const files = data?.files || [];
    this.cache.clear();
    for (const file of files) {
      if (file.name && file.id) {
        this.cache.set(file.name, file.id);
      }
    }
    if (prefix) {
      return files.filter((f) => f.name && f.name.startsWith(prefix));
    }
    return files;
  }
  async _findByName(name) {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    await this._listAll();
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    throw new DriveFilesError(`File not found: ${name}`, "NOT_FOUND", 404);
  }
};

// src/index.ts
init_DriveFilesError();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DriveFiles,
  DriveFilesError
});
