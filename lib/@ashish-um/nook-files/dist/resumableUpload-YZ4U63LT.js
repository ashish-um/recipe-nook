import {
  DriveFilesError,
  xhrUpload
} from "./chunk-F7TEJHJL.js";

// src/utils/resumableUpload.ts
var CHUNK_SIZE = 256 * 1024;
var UPLOAD_CHUNK_SIZE = CHUNK_SIZE * 4;
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
export {
  resumableUpload
};
