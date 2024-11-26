import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/action.ts', // Punto de entrada de tu aplicación
    output: [
      {
        file: 'dist/action.cjs.js', // Bundle CommonJS
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(), // Resuelve dependencias en node_modules
      commonjs(), // Convierte CommonJS a ESModules
      json(), // Permite importar archivos JSON
      typescript() // Soporte para TypeScript
    ]
  },
  {
    input: 'src/autoupdate.ts', // Punto de entrada de tu aplicación
    output: [
      {
        file: 'dist/autoupdate.cjs.js', // Bundle CommonJS
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(), // Resuelve dependencias en node_modules
      commonjs(), // Convierte CommonJS a ESModules
      json(), // Permite importar archivos JSON
      typescript() // Soporte para TypeScript
    ]
  },
  {
    input: 'src/release.ts', // Punto de entrada de tu aplicación
    output: [
      {
        file: 'dist/release.cjs.js', // Bundle CommonJS
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(), // Resuelve dependencias en node_modules
      commonjs(), // Convierte CommonJS a ESModules
      json(), // Permite importar archivos JSON
      typescript() // Soporte para TypeScript
    ]
  }
];
