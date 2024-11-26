import * as fs from 'fs';

export class DesktopParser {
  data: { [key: string]: { [key: string]: string } } = {};

  constructor(filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let currentSection: string | null = null;

    // Dividir el archivo en líneas y procesar cada una
    const lines = fileContent.split('\n');
    lines.forEach((line) => {
      line = line.trim();

      // Ignorar comentarios y líneas vacías
      if (!line || line.startsWith('#')) {
        return;
      }

      // Detectar nueva sección
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.substring(1, line.length - 1);
        this.data[currentSection] = {};
      } else if (line.includes('=') && currentSection) {
        // Dividir clave y valor
        const [key, value] = line.split('=', 2).map((str) => str.trim());
        if (currentSection) {
          this.data[currentSection][key] = value;
        }
      }
    });
  }

  persist(filePath: string): void {
    let fileContent = '';

    for (const section in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, section)) {
        fileContent += `[${section}]\n`;

        for (const key in this.data[section]) {
          if (Object.prototype.hasOwnProperty.call(this.data[section], key)) {
            fileContent += `${key}=${this.data[section][key]}\n`;
          }
        }

        fileContent += '\n'; // Añadir una línea en blanco entre secciones
      }
    }

    // Escribir el contenido al archivo
    fs.writeFileSync(filePath, fileContent, 'utf-8');
  }
}
