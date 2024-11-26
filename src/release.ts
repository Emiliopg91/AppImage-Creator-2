import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { GitHubHelper } from './utils/GitHubHelper';

async function main(): Promise<void> {
  try {
    GitHubHelper.initialize();
    console.log('ENTORNO:');
    await GitHubHelper.deleteRelease('latest');
    await GitHubHelper.deleteTag('latest');

    const versionFilePath = path.resolve(process.cwd(), 'version.txt');
    const latestVersion = fs.readFileSync(versionFilePath, 'utf-8').trim();
    const newVersion = GitHubHelper.incrementVersion(latestVersion!);
    fs.writeFileSync(versionFilePath, newVersion, 'utf-8');

    execSync('git config --global user.email "actions@github.com"');
    execSync('git config --global user.name "github-actions"');
    await GitHubHelper.stashPath(path.resolve(process.cwd()));
    await GitHubHelper.commit(`[ci skip] Release for version ${newVersion}`);
    await GitHubHelper.push();

    await GitHubHelper.createTag(newVersion);
    await GitHubHelper.createRelease(newVersion);
    await GitHubHelper.createTag('latest');
    await GitHubHelper.createRelease('latest');
  } catch (error: any) {
    console.error('Error en la operación de GitHub:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  (async (): Promise<void> => {
    await main();
  })();
}
