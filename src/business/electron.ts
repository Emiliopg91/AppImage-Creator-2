import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

import { AppImageTool } from '../utils/AppImageTool';
// Asegúrate de que exista esta clase en TypeScript
import { DesktopParser } from '../utils/DesktopParser';
// Asegúrate de que exista esta clase en TypeScript
import { GitHubHelper } from '../utils/GitHubHelper';

export class ElectronAppImageProcessor {
  private static removeUnneededDistEntries(): void {
    try {
      core.startGroup('Removing unneeded entries on dist folder');
      const files = fs.readdirSync('.');

      files.forEach((file) => {
        if (!file.endsWith('.AppImage')) {
          const filePath = path.join('.', file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          } else {
            fs.rmdirSync(filePath, { recursive: true });
          }
        }
      });
    } finally {
      core.endGroup();
    }
  }

  private static findAppImage(): string | null {
    try {
      core.startGroup('Looking for AppImage file');
      const files = fs.readdirSync('.');

      for (const file of files) {
        if (file.endsWith('.bk.AppImage')) {
          core.info(`Restoring AppImage for tests: ${file}`);
          fs.renameSync(file, file.replace('.bk.', '.'));
          break;
        }
      }

      for (const file of files) {
        if (file.endsWith('.AppImage')) {
          const filePath = path.resolve(file);
          core.info(`Found AppImage: ${filePath}`);
          return filePath;
        }
      }

      return null;
    } finally {
      core.endGroup();
    }
  }

  private static modifySquashFSRoot(
    appImageTool: AppImageTool,
    appName: string,
    latestUrl: string
  ): void {
    try {
      core.startGroup('Modifying squashfs-root');
      const pwd = process.cwd();
      const squashFSRootDir = path.join(pwd, 'squashfs-root');

      process.chdir(squashFSRootDir);

      fs.rmSync('AppRun', { force: true });
      fs.rmSync('.DirIcon', { force: true });

      const statics = ['usr', `${appName.toLowerCase()}.png`, `${appName.toLowerCase()}.desktop`];
      fs.mkdirSync(appName);

      const files = fs.readdirSync('.');
      files.forEach((file) => {
        if (!statics.includes(file) && file !== appName) {
          fs.renameSync(file, path.join(appName, file));
        }
      });

      fs.copyFileSync(appImageTool.apprunFile, path.basename(appImageTool.apprunFile));
      const autoupdateFolder = path.join(squashFSRootDir, 'usr', 'bin', 'autoupdate');

      fs.mkdirSync(autoupdateFolder, { recursive: true });
      fs.copyFileSync(
        appImageTool.autoupFile,
        path.join(autoupdateFolder, path.basename(appImageTool.autoupFile))
      );

      fs.renameSync(appName, path.join('usr', 'bin', appName));

      core.info('Modifying desktop file');
      const desktop = new DesktopParser(`${appName.toLowerCase()}.desktop`);
      desktop.data['Desktop Entry']['Exec'] = `${appName}/${appName.toLowerCase()}`;
      desktop.data['Desktop Entry']['X-GitHub-Api'] = latestUrl;
      desktop.persist(`${appName.toLowerCase()}.desktop`);

      process.chdir(pwd);
      fs.renameSync('squashfs-root', appName);
    } finally {
      core.endGroup();
    }
  }

  public static async processAppImage(): Promise<void> {
    const appImageTool = new AppImageTool();
    let appImage: string | null = null;

    process.chdir(path.join(GitHubHelper.workspacePath, 'dist'));
    appImage = ElectronAppImageProcessor.findAppImage();
    const appName = path.basename(appImage!).replace('.AppImage', '');
    if (appImage === null) {
      throw new Error('AppImage file not found');
    }

    ElectronAppImageProcessor.removeUnneededDistEntries();
    await appImageTool.extractAppImage(appImage);
    ElectronAppImageProcessor.modifySquashFSRoot(appImageTool, appName, GitHubHelper.latestUrl);

    const desktop = new DesktopParser(path.join(appName, `${appName.toLowerCase()}.desktop`));
    const version = desktop.data['Desktop Entry']['X-AppImage-Version'];

    await appImageTool.createAppImage(appName, version, path.resolve(appName));
  }
}
