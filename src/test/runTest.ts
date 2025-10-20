import path from 'path';
import fs from 'fs';
import os from 'os';

import { runTests } from 'vscode-test';

const main = async () => {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, `..${path.sep}..${path.sep}`);

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, `.${path.sep}suite${path.sep}index`);

    // Create isolated directories to ensure no user-installed extensions interfere
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-go-template-plus-plus-'));
    const extensionsDir = path.join(tmpRoot, 'extensions-empty');
    const userDataDir = path.join(tmpRoot, 'user-data');
    fs.mkdirSync(extensionsDir, { recursive: true });
    fs.mkdirSync(userDataDir, { recursive: true });

    const launchArgs = [
      '--disable-extensions',
      '--extensions-dir',
      extensionsDir,
      '--user-data-dir',
      userDataDir,
    ];

    // Download VS Code, unzip it and run the integration test
    await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
};

main();
