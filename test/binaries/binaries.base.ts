import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import * as tar from 'tar';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require('@actions/core');

// Mock the GitHub Actions core library
export const debugMock = jest.spyOn(core, 'debug').mockImplementation();
export const getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
export const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
export const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();
export const exportVariableMock = jest.spyOn(core, 'exportVariable').mockImplementation();

const fileUrl = 'https://code.visualstudio.com/sha/download?build=stable&os=linux-x64';
const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-'));
const tarGzPath = path.resolve(tmpPath, 'vscode-installer.tar.gz');
const binariesPath = path.join(tmpPath, 'binaries');
const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-workspace-binaries-'));
export const actionPath = path.join(workspacePath, 'action');
const appDesktopPath = path.join(workspacePath, 'app.desktop');

const envMap: Record<string, string> = {
  GITHUB_REPOSITORY: 'Emiliopg91/VSCode-AppImage',
  GITHUB_ACTION_PATH: actionPath,
  GITHUB_WORKSPACE: workspacePath
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

  const writer = fs.createWriteStream(tarGzPath);
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => {
      resolve();
    });
    writer.on('error', reject);
  });

  if (fs.existsSync(binariesPath)) {
    fs.rmSync(binariesPath, { recursive: true, force: true });
  }
  fs.mkdirSync(binariesPath);

  await tar.x({
    file: tarGzPath,
    C: binariesPath
  });
};

export const baseBeforeEach = async () => {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
  if (fs.existsSync(actionPath)) {
    fs.rmSync(actionPath, { recursive: true, force: true });
  }
  fs.mkdirSync(actionPath, { recursive: true });

  fs.copyFileSync(path.join(__dirname, 'app.desktop'), appDesktopPath);
  fs.cpSync(path.resolve('resources'), path.join(actionPath, 'resources'), {
    force: true,
    recursive: true
  });
  fs.cpSync(path.resolve('dist'), path.join(actionPath, 'dist'), {
    force: true,
    recursive: true
  });

  fs.cpSync(
    path.join(binariesPath, 'VSCode-linux-x64'),
    path.join(workspacePath, 'VSCode-linux-x64'),
    { force: true, recursive: true }
  );

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
