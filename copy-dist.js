const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist', 'src');
const destDir = path.join(__dirname, 'dist');

if (fs.existsSync(srcDir)) {
  console.log('Moving dist/src contents to dist/ to match Render expectations...');
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Copy complete! dist/main.js should now exist.');
} else {
  console.log('dist/src does not exist, skipping copy.');
}
