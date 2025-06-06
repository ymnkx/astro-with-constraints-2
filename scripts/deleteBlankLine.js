import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const directoryPath = path.join(__dirname, '../build/htdocs');

function deleteBlankLines(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const result = data
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
  fs.writeFileSync(filePath, result, 'utf8');
}

function processDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    files.forEach((file) => {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        processDirectory(filePath);
      } else if (path.extname(file) === '.html') {
        deleteBlankLines(filePath);
      }
    });
  });
}

processDirectory(directoryPath);
