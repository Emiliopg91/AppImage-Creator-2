import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-workspace-electron-'));
export const appImagePath = path.resolve(workspacePath, 'RogControlCenter.AppImage');

export const baseBeforeAll = async (): Promise<void> => {
  //
};

export const baseBeforeEach = async (): Promise<void> => {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
  fs.mkdirSync(workspacePath, { recursive: true });
  fs.writeFileSync(appImagePath, '');
  fs.chmodSync(appImagePath, 0o755);

  console.log(
    `#### START ${expect.getState().currentTestName} #######################################`
  );

  jest.clearAllMocks();
};

export const baseAfterEach = async (): Promise<void> => {
  console.log(
    `###### END ${expect.getState().currentTestName} #######################################`
  );
  fs.rmSync(workspacePath, { recursive: true, force: true });
};

export const baseAfterAll = async (): Promise<void> => {
  //
};
