import * as core from '@actions/core';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { DesktopParser } from './DesktopParser';

export class InputParameters {
  name: string;
  version: string;
  entrypoint: string;
  icon: string;
  desktop: string;

  constructor(name: string, version: string, entrypoint: string, icon: string, desktop: string) {
    this.name = name;
    this.entrypoint = path.resolve(entrypoint);
    this.icon = path.resolve(icon);
    this.desktop = path.resolve(desktop);
    this.version = version;
  }

  static fromDesktopFile(): InputParameters {
    const desktopFile = InputParameters.findDesktopFile();

    core.info('Loading desktop file data');

    const desktop = new DesktopParser(desktopFile);

    const name = desktop.data['Desktop Entry']['Name'];
    const entrypoint = desktop.data['AppImage Creator']['Entrypoint'];
    const icon = desktop.data['AppImage Creator']['Icon'];
    const versionCmd = desktop.data['AppImage Creator']['Version-Cmd'];
    core.info(`Getting version by running: ${versionCmd}`);

    try {
      const result = InputParameters.runCommand(versionCmd);

      const version = result.trim();

      core.info('Saving working desktop file');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newDesktopData: any = {};
      for (const [section, values] of Object.entries(desktop.data)) {
        if (section !== 'AppImage Creator') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newDesktopSectionData: any = {};
          for (const [key, value] of Object.entries(values)) {
            const updatedValue = value
              .replace('{version}', version)
              .replace(
                '{entrypoint}',
                path.join(name.replace(/ /g, '_'), path.basename(entrypoint))
              )
              .replace('{icon}', 'logo');
            newDesktopSectionData[key] = updatedValue;
          }
          newDesktopData[section] = newDesktopSectionData;
        }
      }

      const desktopPath = path.resolve('aux.desktop');
      desktop.data = newDesktopData;
      desktop.persist(desktopPath);

      return new InputParameters(name, version, entrypoint, icon, desktopPath);
    } catch (error) {
      console.error('Error while running version command:', error);
      throw new Error(`Command failed: ${error}`);
    }
  }

  static runCommand(command: string): string {
    return child_process.execSync(command).toString();
  }

  static findDesktopFile(): string {
    const currentDirectory = process.cwd();
    core.info(`Looking for .desktop file in '${currentDirectory}'`);

    const files = fs.readdirSync(currentDirectory);
    for (const file of files) {
      if (file.endsWith('.desktop') && file !== 'aux.desktop' && fs.statSync(file).isFile()) {
        core.info(`Found '${path.join(currentDirectory, file)}'`);
        return file;
      }
    }

    throw new Error("Couldn't find .desktop file");
  }
}
