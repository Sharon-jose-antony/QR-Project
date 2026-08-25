const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Build] Building frontend with Vite...');
execSync('npm --prefix frontend install', { stdio: 'inherit' });
execSync('npm --prefix frontend run build', { stdio: 'inherit' });

const srcDir = path.join(__dirname, '..', 'frontend', 'dist');
const destDir = path.join(__dirname, '..', 'dist');

console.log(`[Build] Copying artifacts from ${srcDir} to ${destDir}...`);
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.cpSync(srcDir, destDir, { recursive: true });
console.log('[Build] Build complete! Root dist/ is populated.');
