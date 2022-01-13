const { v4: uuidv4 } = require("uuid");

module.exports = {
  generateUniqueId: () => {
    return uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
  },

  getFilePath: (fileName, fileId) => {
    return `/home/touch/Desktop/resumable-uploading-nodejs/server/uploads/file-${fileId}-${fileName}`;
  },
};
