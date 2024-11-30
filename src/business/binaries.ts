import { AppImageTool } from '../utils/AppImageTool';
// Asegúrate de que exista esta clase en TypeScript
import { GitHubHelper } from '../utils/GitHubHelper';
// Asegúrate de que exista esta clase en TypeScript
import { InputParameters } from '../utils/InputParameters';

// Asegúrate de que exista esta clase en TypeScript

export class BinaryAppImageProcessor {
  public static async processAppImage(): Promise<void> {
    const appImageTool = new AppImageTool();
    const githubWorkspace = GitHubHelper.workspacePath;

    process.chdir(githubWorkspace);

    const parametros = InputParameters.fromDesktopFile();

    if (await GitHubHelper.checkUpdateRequired(parametros.version)) {
      appImageTool.createResources(
        parametros.name,
        parametros.version,
        parametros.icon,
        parametros.entrypoint,
        parametros.desktop
      );

      await appImageTool.createAppImage(parametros.name, parametros.version);
    }
  }
}
