import * as github from '@actions/github';
import * as fs from 'fs';

import {
  baseAfterAll,
  baseAfterEach,
  baseBeforeAll,
  baseBeforeEach,
  exportVariableMock,
  getInputMock,
  setFailedMock
} from './binaries.base';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const main = require('../../src/action');

jest.setTimeout(120000);

const runMock = jest.spyOn(main, 'run');
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn()
}));

describe('Main action body', () => {
  beforeAll(async (): Promise<void> => {
    await baseBeforeAll();
  });
  beforeEach(async () => {
    await baseBeforeEach();
  });
  afterEach(async () => {
    await baseAfterEach();
  });
  afterAll(async () => {
    await baseAfterAll();
  });

  it('Build AppImage from binaries', async () => {
    const getLatestReleaseMock = jest.fn().mockResolvedValue({
      status: 202,
      data: {
        name: '1.0.0',
        tag_name: '1.0.0',
        assets: [
          {
            id: 1,
            name: 'Visual-Studio-Code.AppImage',
            browser_download_url:
              'https://github.com/Emiliopg91/RogControlCenter/releases/download/1.0.0/RogControlCenter.AppImage'
          }
        ]
      }
    });

    (github.getOctokit as jest.Mock).mockReturnValue({
      rest: {
        repos: {
          getLatestRelease: getLatestReleaseMock
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const envVariables: { [key: string]: any } = {};

    exportVariableMock.mockImplementation((name, value) => {
      envVariables[String(name)] = value;
      console.info(`Exported environment variable '${name}'='${value}'`);
    });

    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name) => {
      switch (name) {
        case 'token':
          return '<github_secret_token>';
        case 'is_electron':
          return 'false';
      }
      console.error(`Input value not mocked for '${name}'`);
    });

    await main.run();
    expect(runMock).toHaveReturned();
    expect(setFailedMock).toHaveBeenCalledTimes(0);
    expect(fs.existsSync(envVariables['APPIMAGE_PATH'])).toBe(true);
  });
});
