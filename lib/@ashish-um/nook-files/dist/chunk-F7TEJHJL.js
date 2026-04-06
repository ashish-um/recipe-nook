// src/DriveFilesError.ts
var DriveFilesError = class _DriveFilesError extends Error {
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

export {
  DriveFilesError,
  xhrUpload
};
