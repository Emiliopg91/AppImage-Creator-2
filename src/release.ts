import { execSync } from 'child_process';
import path from 'path';

import { GitHubHelper } from './utils/GitHubHelper';

async function main(): Promise<void> {
  try {
    GitHubHelper.initialize();
    console.log('ENTORNO:');
    await GitHubHelper.deleteRelease('latest');
    await GitHubHelper.deleteTag('latest');

    const latestVersion = execSync(
      `cat ${path.join(process.cwd(), 'package.json')} | jq -r .version`,
      { encoding: 'utf-8' }
    ).trim();
    const newVersion = GitHubHelper.incrementVersion(latestVersion!);
    execSync(
      `jq '.version = "${latestVersion}"' package.json > tmp.json && mv tmp.json package.json`
    );

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
