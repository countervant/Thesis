const fs = require('fs');
const path = require('path');

const CLIENT_SRC = path.join(process.cwd(), 'Client/src');
const COMPONENTS_DIR = path.join(CLIENT_SRC, 'components');
const SERVER_DIR = path.join(process.cwd(), 'Server');

const componentsToMove = [
  'AppLoadingScreen',
  'ConfirmDialog',
  'CountrySelect',
  'Dashboard',
  'InitialsAvatar',
  'ProjectGanttChart',
  'Skeleton'
];

function moveComponents() {
  for (const comp of componentsToMove) {
    const oldPath = path.join(COMPONENTS_DIR, `${comp}.jsx`);
    const newDir = path.join(COMPONENTS_DIR, comp);
    const newPath = path.join(newDir, `${comp}.jsx`);
    
    if (fs.existsSync(oldPath)) {
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
      fs.renameSync(oldPath, newPath);
      console.log(`Moved ${comp}.jsx to ${comp}/${comp}.jsx`);
    }
  }
}

function processDirectory(dir, updateFn) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDirectory(fullPath, updateFn);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = updateFn(content, fullPath);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated imports in ${fullPath.replace(process.cwd(), '')}`);
      }
    }
  }
}

function updateFrontendImports() {
  processDirectory(CLIENT_SRC, (content) => {
    let newContent = content;
    for (const comp of componentsToMove) {
      // Matches: ".../components/ComponentName" or ".../components/ComponentName.jsx"
      const regex = new RegExp(`(['"])(.*?/components/)${comp}(?:\\.jsx)?(['"])`, 'g');
      newContent = newContent.replace(regex, `$1$2${comp}/${comp}$3`);
      
      // Also match if it's imported directly from current dir like "./ComponentName"
      // Wait, let's just match any import that ends with /ComponentName or is exactly ComponentName
      const regex2 = new RegExp(`(['"])(.*?\\/)${comp}(?:\\.jsx)?(['"])`, 'g');
      newContent = newContent.replace(regex2, (match, p1, p2, p3) => {
          // avoid matching inside components/ComponentName/ComponentName.jsx itself
          if (p2.endsWith(`/${comp}/`)) return match;
          return `${p1}${p2}${comp}/${comp}${p3}`;
      });
    }
    return newContent;
  });
}

function renameBackendModelTypos() {
  const oldPath = path.join(SERVER_DIR, 'model/Admin/newsfeesModel.js');
  const newPath = path.join(SERVER_DIR, 'model/Admin/newsfeedModel.js');
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed newsfeesModel.js to newsfeedModel.js');
  }

  processDirectory(SERVER_DIR, (content) => {
    return content.replace(/newsfeesModel/g, 'newsfeedModel');
  });
}

function renameModelFolder() {
  const oldPath = path.join(SERVER_DIR, 'model');
  const newPath = path.join(SERVER_DIR, 'models');
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed model to models');
  }

  processDirectory(SERVER_DIR, (content, filePath) => {
    // replace /model/ with /models/ in imports
    // example: import User from '../model/userModel.js';
    return content.replace(/(['"])(.*\/)model(\/.*['"])/g, '$1$2models$3');
  });
}

console.log('Starting refactor...');
moveComponents();
updateFrontendImports();
renameBackendModelTypos();
renameModelFolder();
console.log('Refactor complete.');
