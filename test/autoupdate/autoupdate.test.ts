import * as fs from 'fs';

import {
  appImagePath,
  baseAfterAll,
  baseAfterEach,
  baseBeforeAll,
  baseBeforeEach
} from './autoupdate.base';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const main = require('../../src/autoupdate');

const runMock = jest.spyOn(main, 'run');
jest.setTimeout(120000);

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn((command: string, args: string[]) => {
    if (command === 'notify-send' || command.endsWith('.AppImage')) {
      return undefined;
    }

    return jest.requireActual('child_process').execFileSync(command, args);
  })
}));

describe('Autoupdate tests', () => {
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

  it('Update AppImage file', async () => {
    await main.run(
      '1.0.0',
      'https://api.github.com/repos/Emiliopg91/RogControlCenter/releases/latest',
      'RogControlCenter',
      appImagePath
    );
    expect(runMock).toHaveReturned();
    expect(fs.statSync(appImagePath).size > 1024).toBe(true);
  });
});
