import * as core from '@actions/core';
import fs from 'fs';
import path from 'path';
import { inspect } from 'util';

import { BinaryAppImageProcessor } from './business/binaries';
import { ElectronAppImageProcessor } from './business/electron';
import { GitHubHelper } from './utils/GitHubHelper';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function run(): Promise<void> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;
    core.info(`Running action version ${version}`);
    core.startGroup('Environment info');
    core.info(JSON.stringify(process.env, null, 4));
    core.endGroup();

    await GitHubHelper.initialize();

    const forElectron =
      process.env.INPUT_ELECTRON != undefined ? process.env.INPUT_ELECTRON == 'true' : false;
    core.info(`Input value for is_electron: ${forElectron}`);
    if (forElectron) {
      core.info('Running action for Electron app');
      await ElectronAppImageProcessor.processAppImage();
    } else {
      core.info('Running action for app from binaries');
      await BinaryAppImageProcessor.processAppImage();
    }
  } catch (error) {
    core.error(inspect(error));
    core.setFailed(getErrorMessage(error));
  }
}

if (require.main === module) {
  (async (): Promise<void> => {
    await run();
  })();
}
