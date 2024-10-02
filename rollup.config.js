/* eslint-env node */
import pkg from './package.json';
import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/gcode-preview.ts', // our source file
    output: [
      {
        file: pkg.main,
        format: 'es' // the preferred format
      },
      {
        file: 'dist/gcode-preview.js',
        format: 'umd', // deprecated. might not work at some point
        name: 'GCodePreview', // the global which can be used in a browser
        globals: {
          three: 'THREE'
        }
      }
    ],
    external: [...Object.keys(pkg.dependencies || {})],
    plugins: [nodeResolve(), esbuild()]
  },
  {
    input: 'src/gcode-preview.ts',
    output: [{ file: 'dist/gcode-preview.d.ts', format: 'es' }],
    plugins: [dts()]
  }
];
