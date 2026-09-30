// Electron Builder 26's built-in Azure provider requires a long-lived credential.
// The custom signer instead uses the Azure CLI session established by GitHub OIDC.
const base = require('./package.json').build;

module.exports = {
  ...base,
  forceCodeSigning: true,
  nsis: { runAfterFinish: false },
  win: {
    ...base.win,
    signtoolOptions: {
      sign: './scripts/windows/sign.cjs',
      signingHashAlgorithms: ['sha256'],
      publisherName: 'Ricos Labs LLC',
    },
  },
};
