import {
  DriveFilesError,
  xhrUpload
} from "./chunk-F7TEJHJL.js";

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
      const { resumableUpload } = await import("./resumableUpload-YZ4U63LT.js");
      return resumableUpload({
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
export {
  DriveFiles,
  DriveFilesError
};
