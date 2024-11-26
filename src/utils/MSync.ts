import * as core from '@actions/core';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class MSync {
  static readonly blockSize = 1024 * 1024;

  name: string;
  size: number;
  hash: string;
  blocks: string[];
  url?: string;

  constructor(name: string, size: number, hash: string, blocks: string[], url?: string) {
    this.name = name;
    this.size = size;
    this.hash = hash;
    this.blocks = blocks;
    this.url = url;
  }

  toFile(filePath: string): void {
    const data = {
      name: this.name,
      size: this.size,
      hash: this.hash,
      blocks: this.blocks
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async patch(filePath: string, binaryUrl?: string, overwrite = true): Promise<void> {
    const t0 = Date.now();
    const session: AxiosInstance = axios.create();
    const tmpPath = path.join(os.tmpdir(), `msync-${crypto.randomBytes(8).toString('hex')}`);
    const url = binaryUrl || this.url?.substring(0, this.url.lastIndexOf('.'));

    if (!url) {
      throw new Error('URL no proporcionada para descargar el archivo binario.');
    }

    try {
      const fileHash = MSync.calculateFileHash(filePath);
      if (fileHash === this.hash) {
        core.info(`No se detectaron cambios en el archivo '${filePath}'`);
        return;
      }

      core.info(`Aplicando cambios para '${filePath}'`);
      fs.copyFileSync(filePath, tmpPath);

      const currentSize = fs.statSync(tmpPath).size;
      if (currentSize < this.size) {
        const padding = Buffer.alloc(this.size - currentSize);
        fs.appendFileSync(tmpPath, padding);
        core.info(`Archivo ampliado con ${MSync.formatBytes(this.size - currentSize)}`);
      } else if (currentSize > this.size) {
        const fd = fs.openSync(tmpPath, 'r+');
        fs.ftruncateSync(fd, this.size);
        fs.closeSync(fd);
        core.info(`Archivo truncado por ${MSync.formatBytes(currentSize - this.size)}`);
      }

      core.info('Verificando bloques a parchear');
      const blocks = MSync.getFileBlocks(tmpPath);
      const changedBlocks = blocks
        .map((block, index) => (block !== this.blocks[index] ? index : -1))
        .filter((index) => index !== -1);

      const groupedBlocks = MSync.groupBlocks(this.size, changedBlocks);
      const totalSize = groupedBlocks.reduce((acc, [start, end]) => acc + (end - start), 0);

      core.info(`Se necesitan parchear ${changedBlocks.length}/${this.blocks.length} bloques.`);
      core.info(
        `Tamaño estimado de descarga: ${MSync.formatBytes(
          totalSize
        )}/${MSync.formatBytes(this.size)} (${((totalSize / this.size) * 100).toFixed(2)}%)`
      );

      for (const [start, end] of groupedBlocks) {
        const data = await MSync.downloadChunk(session, start, end, url);
        const fd = fs.openSync(tmpPath, 'r+');
        fs.writeSync(fd, data, 0, data.length, start);
        fs.closeSync(fd);
      }
      core.info('Descarga finalizada');

      core.info('Verificando integridad después de la actualización');
      const updatedHash = MSync.calculateFileHash(tmpPath);
      if (updatedHash === this.hash) {
        core.info('    Prueba de integridad superada exitosamente');
        if (overwrite) {
          fs.copyFileSync(tmpPath, filePath);
          core.info(`Archivo actualizado: ${filePath}`);
        }

        const elapsedTime = (Date.now() - t0) / 1000;
        const speed = totalSize / elapsedTime;
        core.info(`Parche terminado en ${elapsedTime.toFixed(3)}s (${MSync.formatBytes(speed)}/s)`);
      } else {
        throw new Error('El checksum no coincide después de la actualización.');
      }
    } finally {
      if (tmpPath && fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    }
  }

  static fromUrl = async (url: string): Promise<MSync> => {
    const response = await axios.get(url);
    const data = response.data;
    return new MSync(data.name, data.size, data.hash, data.blocks, url);
  };

  static fromFile = (filePath: string): MSync => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return new MSync(data.name, data.size, data.hash, data.blocks);
  };

  static fromBinary = (filePath: string): MSync => {
    const name = path.basename(filePath);
    const size = fs.statSync(filePath).size;
    const hash = MSync.calculateFileHash(filePath);
    const blocks = MSync.getFileBlocks(filePath);
    return new MSync(name, size, hash, blocks);
  };

  static getFileBlocks = (filePath: string): string[] => {
    const blocks: string[] = [];
    const fd = fs.openSync(filePath, 'r');

    const buffer = Buffer.alloc(MSync.blockSize);
    let bytesRead: number;

    while ((bytesRead = fs.readSync(fd, buffer, 0, MSync.blockSize, null)) > 0) {
      const hash = MSync.calculateBlockHash(buffer.slice(0, bytesRead));
      blocks.push(hash);
    }

    fs.closeSync(fd);
    return blocks;
  };

  static calculateBlockHash = (block: Buffer): string => {
    const hash = crypto.createHash('md5');
    hash.update(block);
    return hash.digest('hex');
  };

  static calculateFileHash = (filePath: string): string => {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4096);

    let bytesRead: number;
    while ((bytesRead = fs.readSync(fd, buffer, 0, 4096, null)) > 0) {
      hash.update(buffer.slice(0, bytesRead));
    }

    fs.closeSync(fd);
    return hash.digest('hex');
  };

  static downloadChunk = async (
    session: AxiosInstance,
    start: number,
    end: number,
    url: string
  ): Promise<Buffer> => {
    try {
      const response = await axios.get(url, {
        headers: {
          Range: `bytes=${start}-${end - 1}` // Solicitamos el rango de bytes especificado
        },
        responseType: 'arraybuffer' // Asegura que la respuesta sea un buffer
      });

      if (response.status === 206) {
        return Buffer.from(response.data);
      } else {
        throw new Error(`Failed to fetch range. Status code: ${response.status}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(`Error downloading bytes: ${error.message}`);
    }
  };

  static groupBlocks = (fileSize: number, changedBlocks: number[]): [number, number][] => {
    const grouped: [number, number][] = [];
    let startIndex = changedBlocks[0];

    for (let i = 1; i < changedBlocks.length; i++) {
      if (changedBlocks[i] !== changedBlocks[i - 1] + 1) {
        grouped.push([
          startIndex * MSync.blockSize,
          Math.min((changedBlocks[i - 1] + 1) * MSync.blockSize, fileSize)
        ]);
        startIndex = changedBlocks[i];
      }
    }

    grouped.push([
      startIndex * MSync.blockSize,
      Math.min((changedBlocks[changedBlocks.length - 1] + 1) * MSync.blockSize, fileSize)
    ]);

    return grouped;
  };

  static formatBytes = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };
}
