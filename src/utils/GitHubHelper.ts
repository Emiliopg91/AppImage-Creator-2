import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

export class GitHubHelper {
  public static repository = '';
  public static owner = '';
  public static workspacePath = '';
  public static octokit: InstanceType<typeof GitHub> | undefined = undefined;
  public static baseParams: { repo: string; owner: string } = {
    owner: '',
    repo: ''
  };
  public static latestUrl = '';

  public static initialize(): void {
    if (process.env.GITHUB_REPOSITORY) {
      [GitHubHelper.owner, GitHubHelper.repository] = process.env.GITHUB_REPOSITORY.split('/');
    } else {
      throw new Error('Missing GITHUB_REPOSITORY environment variable');
    }

    if (process.env.GITHUB_WORKSPACE) {
      GitHubHelper.workspacePath = process.env.GITHUB_WORKSPACE;
    } else {
      throw new Error('Missing GITHUB_WORKSPACE environment variable');
    }

    if (core.getInput('token') || process.env.GITHUB_TOKEN) {
      GitHubHelper.octokit = github.getOctokit(core.getInput('token') || process.env.GITHUB_TOKEN!);
    } else {
      throw new Error('Missing token action input');
    }

    GitHubHelper.baseParams = {
      owner: GitHubHelper.owner,
      repo: GitHubHelper.repository
    };
    core.info(
      'Using base parameters for octokit: \n' + JSON.stringify(GitHubHelper.baseParams, null, 4)
    );

    GitHubHelper.latestUrl = `https://api.github.com/repos/${GitHubHelper.repository}/${GitHubHelper.owner}/releases/latest`;
  }

  public static setGitHubEnvVariable(variableName: string, value: string): void {
    core.exportVariable(variableName, value);
  }

  public static setGitHubOutVariable(variableName: string, value: string): void {
    core.setOutput(variableName, value);
  }

  static async getLatestVersion(): Promise<string | undefined> {
    const response = await GitHubHelper.octokit!.rest.repos.getLatestRelease({
      ...GitHubHelper.baseParams
    });
    if (response.data?.tag_name) return response.data.tag_name;

    return undefined;
  }

  static async checkUpdateRequired(newVersion: string): Promise<boolean> {
    let update = false;
    const vers = await this.getLatestVersion();
    if (vers && vers !== newVersion) {
      core.info(`New available version ${vers} -> ${newVersion}`);
      update = true;
    } else {
      core.info('AppImage is up-to-date');
    }

    GitHubHelper.setGitHubEnvVariable('IS_UPDATE', update.toString().toLowerCase());
    GitHubHelper.setGitHubOutVariable('is_update', update.toString().toLowerCase());
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
      if (err.status && err.status == 404) {
        core.warning("Release doesn't exist");
      } else {
        throw err;
      }
    }
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
      if (err.status && err.status == 404) {
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
