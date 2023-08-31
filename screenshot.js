
const Property = new (require('./Property'))();
const process = require('process');
const fs = require('fs/promises');
const path = require('path');

async function deleteAllFilesInDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);

    const deleteFilePromises = files.map(file =>
      fs.unlink(path.join(dirPath, file)),
    );

    await Promise.all(deleteFilePromises);
  } catch (err) {
    console.log(err);
  }
}

deleteAllFilesInDir('./photos').then(() => {
  console.log('Removed all files from the specified directory');
});


(async () => {
    await Property.fetch(process.argv[2], process.argv[3], process.argv[4], process.argv[5])
})();