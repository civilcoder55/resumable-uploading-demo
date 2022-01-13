import { uploadFiles,clearFileUpload,retryFileUpload,abortFileUpload,resumeFileUpload } from "./uploader.js";

const files = new Map();
const FILE_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
};

const progressBox = document.getElementById("progress-box");
const updateProgressBox = () => {
  const [title, _, progressStats, {children:[progressBar]}] = progressBox.children;

  if (files.size > 0) {
    let totalUploadedFiles = 0;
    let totalUploadingFiles = 0;
    let totalFailedFiles = 0;
    let totalPausedFiles = 0;
    let totalChunkSize = 0;
    let totalUploadedChunkSize = 0;
    const [uploadedPerc, successCount, failedCount, pausedCount] = progressStats.children;

    files.forEach((fileObj) => {
      if (fileObj.status === FILE_STATUS.FAILED) {
        totalFailedFiles += 1;
      } else {
        if (fileObj.status === FILE_STATUS.COMPLETED) {
          totalUploadedFiles += 1;
        } else if (fileObj.status === FILE_STATUS.PAUSED) {
          totalPausedFiles += 1;
        } else {
          totalUploadingFiles += 1;
        }

        totalChunkSize += fileObj.size;
        totalUploadedChunkSize += fileObj.uploadedChunkSize;
      }
    });

    const percentage =
      totalChunkSize > 0 ? Math.min(100, Math.round((totalUploadedChunkSize * 100) / totalChunkSize)) : 0;

    title.textContent =
      percentage === 100
        ? `Uploaded ${totalUploadedFiles} File${totalUploadedFiles !== 1 ? "s" : ""}`
        : `Uploading ${totalUploadingFiles}/${files.size} File${files.size !== 1 ? "s" : ""}`;
    uploadedPerc.textContent = `| Percentage : ${percentage}% |`;
    successCount.textContent = `Success : ${totalUploadedFiles} |`;
    failedCount.textContent = `Failed :${totalFailedFiles} |`;
    pausedCount.textContent = `Paused : ${totalPausedFiles} |`;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.display = "block";
  } else {
    title.textContent = "No Upload in Progress";
    progressBar.style.display = "none";
  }
};

const updateFileElement = (fileObject) => {
  const [
    {
      children: [
        {
          children: [status],
        },
        _,
        {
            children:[progressBar]
        }
      ],
    }, // .file-details
    {
      children: [retryBtn, pauseBtn, resumeBtn, clearBtn],
    }, // .file-actions
  ] = fileObject.element.children;

  requestAnimationFrame(() => {
    status.textContent =
      fileObject.status === FILE_STATUS.COMPLETED ? fileObject.status : `${Math.round(fileObject.percentage)}%`;
    progressBar.style.width = fileObject.percentage + "%";
    progressBar.style.background =
      fileObject.status === FILE_STATUS.COMPLETED ? "green" : fileObject.status === FILE_STATUS.FAILED ? "red" : "#222";
    pauseBtn.style.display = fileObject.status === FILE_STATUS.UPLOADING ? "inline-block" : "none";
    retryBtn.style.display = fileObject.status === FILE_STATUS.FAILED ? "inline-block" : "none";
    resumeBtn.style.display = fileObject.status === FILE_STATUS.PAUSED ? "inline-block" : "none";
    clearBtn.style.display =
      fileObject.status === FILE_STATUS.COMPLETED || fileObject.status === FILE_STATUS.PAUSED ? "inline-block" : "none";
    updateProgressBox();
  });
};

const setFileElement = (file) => {
  const extIndex = file.name.lastIndexOf(".");
  const fileElement = document.createElement("div");
  fileElement.innerHTML = `
  <div style="position: relative">
      <p>
          <span>pending</span>
          <span>${file.name.substring(0, extIndex)}</span>
          <span>${file.name.substring(extIndex)}</span>
      </p>
      <br>
      <div class="progress">
            <div class="progress-bar file-progress-bar" role="progressbar" style="width: 0;"></div>
      </div>
      <br>
  </div>
  <div >
      <button type="button" class="btn btn-secondary btn-sm" style="display: none">Retry</button>
      <button type="button" class="btn btn-warning btn-sm" style="display: none">Pause</button>
      <button type="button" class="btn btn-success btn-sm" style="display: none">Resume</button>
      <button type="button" class="btn btn-danger btn-sm" style="display: none">Clear</button>
  </div>
<hr>`;
  files.set(file, {
    element: fileElement,
    size: file.size,
    status: FILE_STATUS.PENDING,
    percentage: 0,
    uploadedChunkSize: 0,
  });

  const [
    _,
    {
      children: [retryBtn, pauseBtn, resumeBtn, clearBtn],
    },
  ] = fileElement.children;

  clearBtn.addEventListener("click", () => {
    clearFileUpload(file);
    files.delete(file);
    fileElement.remove();
    updateProgressBox();
  });
  retryBtn.addEventListener("click", () => retryFileUpload(file));
  pauseBtn.addEventListener("click", () => abortFileUpload(file));
  resumeBtn.addEventListener("click", () => resumeFileUpload(file));
  progressBox.querySelector(".files-wrapper").appendChild(fileElement);
};

const reportComplete = (e, file) => {
  const fileObj = files.get(file);

  fileObj.status = FILE_STATUS.COMPLETED;
  fileObj.percentage = 100;

  updateFileElement(fileObj);
};

const reportProgress = (e, file) => {
  const fileObj = files.get(file);

  fileObj.status = FILE_STATUS.UPLOADING;
  fileObj.percentage = e.percentage;
  fileObj.uploadedChunkSize = e.loaded;

  updateFileElement(fileObj);
};

const reportError = (e, file) => {
  const fileObj = files.get(file);

  fileObj.status = FILE_STATUS.FAILED;
  fileObj.percentage = 100;

  updateFileElement(fileObj);
};

const reportAbort = (e, file) => {
  const fileObj = files.get(file);

  fileObj.status = FILE_STATUS.PAUSED;

  updateFileElement(fileObj);
};

export default (files) => {
  [...files].forEach(setFileElement);

  uploadFiles(files, {
    reportProgress,
    reportError,
    reportAbort,
    reportComplete,
  });
};
