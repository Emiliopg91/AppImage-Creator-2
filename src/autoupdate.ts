import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import path from 'path';
import process from 'process';

import { MSync } from './utils/MSync';

async function getLatestRelease(apiUrl: string): Promise<Record<string, string>> {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch release info from ${apiUrl}: ${response.statusText}`);
  }
  return await response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLatestMsyncUrl(release: any): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = release.assets.find((asset: any) => asset.name.toLowerCase().endsWith('.msync'));
  if (!asset) {
    throw new Error('MSync file not found');
  }
  return asset.browser_download_url;
}

export async function run(
  version: string,
  githubUrl: string,
  name: string,
  appImage: string
): Promise<void> {
  try {
    core.info(`${name} v.${version}`);
    core.info(`Checking for updates on ${githubUrl}`);

    const release = await getLatestRelease(githubUrl);
    const latestVersion = release['tag_name'];

    if (latestVersion !== version) {
      core.info(`New version ${latestVersion} available`);
      const msyncUrl = getLatestMsyncUrl(release);

      execFileSync('notify-send', [
        'Installing update',
        'Please wait, App will start automatically',
        '--icon',
        path.join(__dirname, 'logo.png')
      ]);

      core.info(`Updating AppImage`);
      const msync = await MSync.fromUrl(msyncUrl);
      await msync.patch(appImage);

      core.info('Launching new instance');
      execFileSync(appImage);
    } else {
      core.info('AppImage up to date');
      process.exit(1);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`Error on autoupdate:\n${error.stack}`);
    process.exit(1);
  }
}

if (require.main === module) {
  (async (): Promise<void> => {
    const [version, githubUrl, name, appImage] = process.argv.slice(2);

    if (!version || !githubUrl || !name || !appImage) {
      throw new Error('Usage: node script.js <version> <githubUrl> <name> <appImage>');
    }
    await run(version, githubUrl, name, appImage);
  })();
}
