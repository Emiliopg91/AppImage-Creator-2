import { execSync } from 'child_process';

import { GitHubHelper } from './utils/GitHubHelper';

async function main(): Promise<void> {
  try {
    GitHubHelper.initialize();
    console.log('ENTORNO:');
    await GitHubHelper.deleteRelease('latest');
    await GitHubHelper.deleteTag('latest');

    const latestVersion = await GitHubHelper.getLatestVersion();
    const newVersion = GitHubHelper.incrementVersion(latestVersion!);

    execSync('git config --global user.email "actions@github.com"');
    execSync('git config --global user.name "github-actions"');
    execSync('git add .');
    execSync(`git commit -m "Release for version ${newVersion}"`);
    execSync('git push');

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
