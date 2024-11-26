import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require('@actions/core');

// Mock the GitHub Actions core library
export const debugMock = jest.spyOn(core, 'debug').mockImplementation();
export const getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
export const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
export const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();
export const exportVariableMock = jest.spyOn(core, 'exportVariable').mockImplementation();

const fileUrl =
  'https://github.com/Emiliopg91/RogControlCenter/releases/download/1.0.2/RogControlCenter.AppImage';
const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-'));
const appImagePath = path.resolve(tmpPath, 'RogControlCenter.AppImage');
const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-workspace-electron-'));
const distPath = path.join(workspacePath, 'dist');
export const actionPath = path.join(workspacePath, 'action');

const envMap: Record<string, string> = {
  GITHUB_REPOSITORY: 'Emiliopg91/RogControlCenter',
  GITHUB_ACTION_PATH: actionPath,
  GITHUB_WORKSPACE: workspacePath,
  INPUT_ELECTRON: 'true'
};

const setEnvironmentVariables = (env: Record<string, string>): void => {
  for (const [clave, valor] of Object.entries(env)) {
    process.env[clave] = valor;
  }
};

export const baseBeforeAll = async (): Promise<void> => {
  const response = await axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(appImagePath);
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => {
      resolve();
    });
    writer.on('error', reject);
  });

  fs.chmodSync(appImagePath, 0o755);
};

export const baseBeforeEach = async () => {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
  if (fs.existsSync(actionPath)) {
    fs.rmSync(actionPath, { recursive: true, force: true });
  }
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(actionPath, { recursive: true });
  fs.mkdirSync(distPath, { recursive: true });

  fs.cpSync(path.resolve('resources'), path.join(actionPath, 'resources'), {
    force: true,
    recursive: true
  });

  fs.cpSync(path.resolve('dist'), path.join(actionPath, 'dist'), {
    force: true,
    recursive: true
  });

  fs.cpSync(appImagePath, path.join(distPath, 'RogControlCenter.AppImage'));

  setEnvironmentVariables(envMap);

  console.log(
    `#### START ${expect.getState().currentTestName} #######################################`
  );

  jest.clearAllMocks();
};

export const baseAfterEach = async () => {
  console.log(
    `###### END ${expect.getState().currentTestName} #######################################`
  );
  fs.rmSync(workspacePath, { recursive: true, force: true });
};

export const baseAfterAll = async () => {
  fs.rmSync(tmpPath, { recursive: true, force: true });
};
