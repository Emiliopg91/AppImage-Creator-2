import path from 'path';

import { GitHubHelper } from './utils/GitHubHelper';

async function main(): Promise<void> {
  try {
    GitHubHelper.initialize();
    console.log('ENTORNO:');
    await GitHubHelper.deleteRelease('latest');
    await GitHubHelper.deleteTag('latest');

    const latestVersion = await GitHubHelper.getLatestVersion();
    const newVersion = GitHubHelper.incrementVersion(latestVersion!);

    await GitHubHelper.stashPath(path.resolve(process.cwd(), 'dist'));
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
