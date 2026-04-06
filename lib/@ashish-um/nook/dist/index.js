// src/DriveError.ts
var DriveError = class _DriveError extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "DriveError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, _DriveError.prototype);
  }
};

// src/utils.ts
function buildMultipartBody(metadata, data, boundary = "drive_crud_boundary_" + Math.random().toString(36).slice(2)) {
  const delimiter = `\r
--${boundary}\r
`;
  const closeDelimiter = `\r
--${boundary}--`;
  const metadataPart = "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata);
  const dataPart = "Content-Type: application/json\r\n\r\n" + JSON.stringify(data);
  const multipartRequestBody = delimiter + metadataPart + delimiter + dataPart + closeDelimiter;
  return {
    body: multipartRequestBody,
    contentType: `multipart/related; boundary=${boundary}`
  };
}

// src/DriveCRUD.ts
var DriveCRUD = class {
  token;
  options;
  cache = /* @__PURE__ */ new Map();
  constructor(token, options = {}) {
    this.token = token;
    this.options = { appSpace: "appDataFolder", ...options };
  }
  setToken(token) {
    this.token = token;
  }
  async create(name, data) {
    try {
      await this._findByName(name);
      throw new DriveError(`File already exists: ${name}`, "ALREADY_EXISTS");
    } catch (e) {
      if (e.code === "ALREADY_EXISTS") throw e;
      if (e.code !== "NOT_FOUND") throw e;
    }
    const space = this.options.appSpace === "drive" ? "drive" : "appDataFolder";
    const metadata = { name, parents: [space] };
    const { body, contentType } = buildMultipartBody(metadata, data);
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size";
    const file = await this._fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body
    });
    if (!file) throw new DriveError("Failed to create file", "API_ERROR");
    this.cache.set(file.name, file.id);
    return file;
  }
  async read(name) {
    const id = await this._findByName(name);
    const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    const data = await this._fetch(url);
    return data;
  }
  async update(name, data) {
    const id = await this._findByName(name);
    const metadata = { name };
    const { body, contentType } = buildMultipartBody(metadata, data);
    const url = `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id,name,modifiedTime,size`;
    const file = await this._fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": contentType },
      body
    });
    if (!file) throw new DriveError("Failed to update file", "API_ERROR");
    return file;
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
      } catch (e) {
      }
      switch (res.status) {
        case 401:
        case 403:
          throw new DriveError(message, "AUTH_ERROR", res.status);
        case 404:
          throw new DriveError(message, "NOT_FOUND", res.status);
        default:
          throw new DriveError(message, "API_ERROR", res.status);
      }
    }
    try {
      return await res.json();
    } catch (e) {
      throw new DriveError("Invalid JSON response", "API_ERROR", res.status);
    }
  }
  async _listAll(prefix) {
    const space = this.options.appSpace === "drive" ? "drive" : "appDataFolder";
    const params = new URLSearchParams({
      spaces: space,
      fields: "files(id,name,modifiedTime,size)",
      pageSize: "1000"
    });
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
    throw new DriveError(`File not found: ${name}`, "NOT_FOUND", 404);
  }
};
export {
  DriveCRUD,
  DriveError
};
