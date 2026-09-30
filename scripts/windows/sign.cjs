const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function sign(configuration) {
  if (process.platform !== 'win32' || configuration.hash !== 'sha256') {
    throw new Error('Artifact Signing requires Windows and SHA256');
  }
  execFileSync('pwsh', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-File',
    path.join(__dirname, 'sign.ps1'), '-FilePath', configuration.path,
  ], { stdio: 'inherit', windowsHide: true });
};
