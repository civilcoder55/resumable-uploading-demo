module.exports = {
  generateUniqueId: () => {
    const heyStack = "0123456789abcdefghijklmnopqrstuvwxyz";
    const randomInt = () => Math.floor(Math.random() * Math.floor(heyStack.length));

    return (length = 24) => Array.from({ length }, () => heyStack[randomInt()]).join("");
  },

  getFilePath: (fileName, fileId) => {
    `./uploads/file-${fileId}-${fileName}`;
  },

  
};
