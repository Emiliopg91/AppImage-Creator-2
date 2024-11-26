import * as core from '@actions/core';
import * as child_process from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';

import { DesktopParser } from './DesktopParser';
import { GitHubHelper } from './GitHubHelper';
import { MSync } from './MSync';

export class AppImageTool {
  public actionDir: string;
  public appimagetoolPath: string;
  public apprunLocalFile: string;
  public autoupLocalFile: string;
  public tmpPath: string;
  public apprunFile: string;
  public autoupFolder: string;
  public autoupFile: string;

  constructor() {
    try {
      core.startGroup('AppImageTool initialization');
      this.actionDir = process.env.GITHUB_ACTION_PATH!;
      this.appimagetoolPath = path.join(this.actionDir, 'resources', 'appimagetool');
      this.apprunLocalFile = path.join(this.actionDir, 'resources', 'AppRun');
      this.autoupLocalFile = path.join(this.actionDir, 'dist', 'autoupdate.cjs.js');
      this.tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'create-appimage-'));
      this.apprunFile = path.join(this.tmpPath, 'AppRun');
      this.autoupFolder = path.join(this.tmpPath, 'usr', 'bin', 'autoupdate');
      this.autoupFile = path.join(this.autoupFolder, 'autoupdate.cjs.js');

      core.info(`Using tmp file '${this.tmpPath}'`);
      core.info(path.resolve(this.apprunLocalFile));

      fs.copyFileSync(this.apprunLocalFile, this.apprunFile);

      fs.mkdirSync(this.autoupFolder, { recursive: true });
      fs.copyFileSync(this.autoupLocalFile, this.autoupFile);
      fs.chmodSync(this.apprunFile, 0o777);
    } finally {
      core.endGroup();
    }
  }

  createResources(
    name: string,
    version: string,
    icon: string,
    entrypoint: string,
    desktopPath: string
  ): void {
    try {
      core.startGroup('Creating squashfs-root');

      const prevCwd = process.cwd();

      process.chdir(this.tmpPath);

      const srcDir = path.dirname(entrypoint);
      const usrBin = path.resolve(path.join('.', 'usr', 'bin', name.replace(/\s+/g, '_')));
      const logoPath = path.resolve(path.join('.', 'logo.png'));
      const desktopEntry = path.join(this.tmpPath, `${name}.desktop`);

      fs.cpSync(srcDir, usrBin, { recursive: true });

      fs.copyFileSync(icon, logoPath);

      const desktopContent = fs.readFileSync(desktopPath, 'utf-8');
      const newContent = desktopContent
        .replace('{name}', name.replace('-AppImage', ''))
        .replace('{version}', version)
        .replace('{entrypoint}', path.basename(entrypoint))
        .replace('{icon}', 'logo')
        .replace('{url}', `https://github.com/${GitHubHelper.repository}`);

      fs.writeFileSync(desktopEntry, newContent);

      const desktop = new DesktopParser(desktopEntry);
      desktop.data['Desktop Entry']['X-GitHub-Api'] = GitHubHelper.latestUrl;
      desktop.persist(desktopEntry);

      process.chdir(prevCwd);
    } finally {
      core.endGroup();
    }
  }

  async createAppImage(
    name: string,
    version: string,
    directory: string = this.tmpPath
  ): Promise<void> {
    try {
      core.startGroup('Creating AppImage');
      const prevCwd = process.cwd();

      process.chdir(directory);

      const fileName = name.replace(/[^a-zA-Z0-9]/g, '-');
      const appImagePath = path.join(this.actionDir, `${fileName}.AppImage`);

      core.info(`Generating AppImage file '${fileName}'`);

      const command = `ARCH=x86_64 ${
        this.appimagetoolPath
      } --comp gzip ${directory} "${appImagePath}" -u "gh-releases-zsync|${GitHubHelper.owner}|${GitHubHelper.repository}|latest|${fileName}.AppImage.zsync"`;

      core.info(`Running '${command}'`);

      await new Promise<void>((resolve, reject) => {
        (async (): Promise<void> => {
          child_process.exec(command, (error, stdout, stderr) => {
            if (error) {
              core.info(stderr);
              core.info('Error running command');
              reject(error);
            } else {
              core.info(stdout);
              console.info('Command executed succesfully');
              resolve();
            }
          });
        })();
      });

      fs.copyFileSync(
        path.join(directory, `${path.basename(appImagePath)}.zsync`),
        `${appImagePath}.zsync`
      );

      core.info(`Generating MSync file '${appImagePath}.msync'`);
      MSync.fromBinary(appImagePath).toFile(`${appImagePath}.msync`);

      GitHubHelper.setGitHubEnvVariable('APPIMAGE_PATH', appImagePath);
      GitHubHelper.setGitHubEnvVariable('MSYNC_PATH', `${appImagePath}.msync`);

      const latestLinuxPath = path.join(this.actionDir, 'latest-linux.yml');
      core.info('Generating latest-linux.yml');

      const sha512 = this.getSha512(appImagePath);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {
        version: version,
        files: {
          url: `${fileName}.AppImage`,
          sha512: sha512,
          size: fs.statSync(appImagePath).size,
          blockMapSize: Math.floor(fs.statSync(appImagePath).size / 1024)
        },
        path: `${fileName}.AppImage`,
        sha512: sha512,
        releaseDate: this.getReleaseDate(appImagePath)
      };

      fs.writeFileSync(latestLinuxPath, yaml.dump(data, { noRefs: true }));

      GitHubHelper.setGitHubEnvVariable('LATEST_LINUX_PATH', latestLinuxPath);

      process.chdir(prevCwd);
    } finally {
      core.endGroup();
    }
  }

  async extractAppImage(file: string): Promise<void> {
    try {
      core.startGroup('Extracting AppImage');
      const command = `${file} --appimage-extract`;
      core.info(`Running '${command}'`);

      await new Promise<void>((resolve, reject) => {
        (async (): Promise<void> => {
          child_process.exec(command, (error, stdout, stderr) => {
            if (error) {
              core.info(stderr);
              core.info('Error running command');
              reject(error);
            } else {
              core.info(stdout);
              console.info('Command executed succesfully');
              resolve();
            }
          });
        })();
      });
    } finally {
      core.endGroup();
    }
  }

  getReleaseDate(path: string): string {
    const stats = fs.statSync(path);
    const timestamp = stats.birthtime || stats.mtime;
    const dt = new Date(timestamp);
    return dt.toISOString();
  }

  getSha512(path: string): string {
    const hash = crypto.createHash('sha512');
    const fileBuffer = fs.readFileSync(path);
    hash.update(fileBuffer);
    return hash.digest('base64');
  }

  cleanup(): void {
    core.info('Cleaning workspace and temporary files');
    fs.rmSync(this.tmpPath, { recursive: true, force: true });
  }
}
