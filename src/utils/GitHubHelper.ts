import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { simpleGit } from 'simple-git';

export class GitHubHelper {
  public static repository = '';
  public static owner = '';
  public static workspacePath = '/workspace';
  public static octokit: InstanceType<typeof GitHub> | undefined = undefined;
  public static baseParams: { repo: string; owner: string } = {
    owner: '',
    repo: ''
  };
  public static latestUrl = '';
  public static git = simpleGit();

  public static async initialize(): Promise<void> {
    try {
      core.startGroup('GitHubHelper initialization');
      const requiredEnv = ['GITHUB_REPOSITORY', 'GITHUB_TOKEN'];
      requiredEnv.forEach((key) => {
        if (process.env[key] == undefined || process.env[key]!.trim() == '') {
          throw new Error(`Missing ${key} environment variable`);
        }
      });

      [GitHubHelper.owner, GitHubHelper.repository] = process.env.GITHUB_REPOSITORY!.split('/');

      const token = process.env.GITHUB_TOKEN!;
      GitHubHelper.octokit = github.getOctokit(token);
      await GitHubHelper.git.remote([
        'set-url',
        'origin',
        `https://${GitHubHelper.owner}:${token}@github.com/${GitHubHelper.owner}/${GitHubHelper.repository}.git`
      ]);

      GitHubHelper.baseParams = {
        owner: GitHubHelper.owner,
        repo: GitHubHelper.repository
      };
      core.info(
        'Using base parameters for octokit: \n' + JSON.stringify(GitHubHelper.baseParams, null, 4)
      );

      GitHubHelper.latestUrl = `https://api.github.com/repos/${GitHubHelper.owner}/${GitHubHelper.repository}/releases/latest`;
    } finally {
      core.endGroup();
    }
  }

  static async getLatestVersion(): Promise<string | undefined> {
    try {
      const response = await GitHubHelper.octokit!.rest.repos.getLatestRelease({
        ...GitHubHelper.baseParams
      });
      return response.data.tag_name;
    } catch (err: any) {
      if (err.status && err.status == 404) {
        core.warning('No previous version published');
        return undefined;
      }
      throw err;
    }
  }

  static async checkUpdateRequired(newVersion: string): Promise<boolean> {
    let update = false;
    const vers = await this.getLatestVersion();
    if (vers !== newVersion) {
      core.info(`New available version ${vers} -> ${newVersion}`);
      update = true;
    } else {
      core.info('AppImage is up-to-date');
    }

    return update;
  }

  static async deleteRelease(tag: string): Promise<void> {
    try {
      core.info(`Deleting release for tag '${tag}'`);
      const release = await GitHubHelper.octokit!.rest.repos.getReleaseByTag({
        ...GitHubHelper.baseParams,
        tag
      });
      await GitHubHelper.octokit!.rest.repos.deleteRelease({
        ...GitHubHelper.baseParams,
        release_id: release.data.id
      });
      core.info(`Deleted`);
    } catch (err: any) {
      if (err.status && (err.status == 404 || err.status == 422)) {
        core.warning("Release doesn't exist");
      } else {
        throw err;
      }
    }
  }

  static async stashPath(path: string): Promise<void> {
    await GitHubHelper.git.add(path);
  }

  static async commit(message: string): Promise<void> {
    await GitHubHelper.git.commit(message);
  }

  static async push(): Promise<void> {
    await GitHubHelper.git.push('origin', 'main');
  }

  static async deleteTag(tag: string): Promise<void> {
    try {
      core.info(`Deleting tag '${tag}'`);
      await GitHubHelper.octokit!.rest.git.deleteRef({
        repo: GitHubHelper.repository!,
        owner: GitHubHelper.owner!,
        ref: `tags/${tag}`
      });
      core.info(`Deleted`);
    } catch (err: any) {
      if (err.status && (err.status == 404 || err.status == 422)) {
        core.warning("Tag doesn't exist");
      } else {
        throw err;
      }
    }
  }

  static async createTag(tag: string): Promise<void> {
    const sha = await GitHubHelper.getDefaultBranchSha();
    core.info(`Creating tag '${tag}' on main commit ${sha}`);
    GitHubHelper.octokit!.rest.git.createTag({
      ...GitHubHelper.baseParams,
      message: `Tag ${tag}`,
      tag,
      type: 'commit',
      object: sha
    });
    core.info('Created');
  }

  static async getDefaultBranchSha(): Promise<string> {
    const branch = await GitHubHelper.octokit?.rest.repos.getBranch({
      ...GitHubHelper.baseParams,
      branch: 'main'
    });
    return branch!.data.commit.sha;
  }

  static async createRelease(tag: string): Promise<void> {
    core.info(`Creating release for tag '${tag}'`);
    GitHubHelper.octokit?.rest.repos.createRelease({
      ...GitHubHelper.baseParams,
      tag_name: tag,
      name: tag,
      body: `Version ${tag} generated automatically.`,
      draft: false,
      prerelease: false
    });
    core.info(`Created.`);
  }

  static incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
}
