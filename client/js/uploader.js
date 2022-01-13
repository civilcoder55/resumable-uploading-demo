const fileRequests = new WeakMap();
const ENDPOINTS = {
  UPLOAD: "http://localhost:3000/upload",
  UPLOAD_STATUS: "http://localhost:3000/status",
  UPLOAD_REQUEST: "http://localhost:3000/request",
};

const defaultOptions = {
  url: ENDPOINTS.UPLOAD,
  startingByte: 0,
  fileId: "",
  reportAbort() {},
  reportProgress() {},
  reportError() {},
  reportComplete() {},
};

const _uploadFileChunks = (file, options) => {
  const formData = new FormData();
  const req = new XMLHttpRequest();
  const chunk = file.slice(options.startingByte);

  formData.append("chunk", chunk, file.name);
  formData.append("fileId", options.fileId);

  req.open("POST", options.url, true);
  req.setRequestHeader(
    "Content-Range",
    `bytes=${options.startingByte}-${options.startingByte + chunk.size}/${file.size}`
  );
  req.setRequestHeader("X-File-Id", options.fileId);

  req.onload = (e) => {
    // it is possible for load to be called when the request status is not 200
    // this will treat 200 only as success and everything else as failure
    if (req.status === 200) {
      options.reportComplete(e, file);
    } else {
      options.reportError(e, file);
    }
  };

  req.upload.onprogress = (e) => {
    const loaded = options.startingByte + e.loaded;
    options.reportProgress(
      {
        ...e,
        loaded,
        total: file.size,
        percentage: (loaded * 100) / file.size,
      },
      file
    );
  };

  req.ontimeout = (e) => options.reportError(e, file);

  req.onabort = (e) => options.reportAbort(e, file);

  req.onerror = (e) => options.reportError(e, file);

  fileRequests.get(file).request = req;

  req.send(formData);
};

const uploadFile = async (file, options) => {
  try {
    const res = await fetch(ENDPOINTS.UPLOAD_REQUEST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
      }),
    });
    const resData = await res.json();
    options = { ...options, ...resData };
    fileRequests.set(file, { request: null, options });

    _uploadFileChunks(file, options);
  } catch (e) {
    options.reportError({...e}, file );
  }
};

export const abortFileUpload = async (file) => {
  const fileReq = fileRequests.get(file);

  if (fileReq && fileReq.request) {
    fileReq.request.abort();
    return true;
  }

  return false;
};

export const retryFileUpload = async (file) => {
  const fileReq = fileRequests.get(file);
  if (fileReq) {
    try {
      const res = await fetch(`${ENDPOINTS.UPLOAD_STATUS}?fileName=${file.name}&fileId=${fileReq.options.fileId}`);
      const resData = await res.json();
      _uploadFileChunks(file, { ...fileReq.options, startingByte: Number(resData.totalChunkUploaded) });
    } catch (e) {
      _uploadFileChunks(file, fileReq.options);
    }
  }
};

export const clearFileUpload = async (file) => {
  const fileReq = fileRequests.get(file);

  if (fileReq) {
    await abortFileUpload(file);
    fileRequests.delete(file);
    return true;
  }

  return false;
};

export const resumeFileUpload = async (file) => {
  const fileReq = fileRequests.get(file);
  if (fileReq) {
    try {
      const res = await fetch(`${ENDPOINTS.UPLOAD_STATUS}?fileName=${file.name}&fileId=${fileReq.options.fileId}`);
      const resData = await res.json();
      _uploadFileChunks(file, { ...fileReq.options, startingByte: Number(resData.totalChunkUploaded) });
    } catch (e) {
      fileReq.options.reportError({ ...e, file });
    }
  }
};

export const uploadFiles = (files, options = defaultOptions) => {
  [...files].forEach((file) => uploadFile(file, { ...defaultOptions, ...options }));
};
