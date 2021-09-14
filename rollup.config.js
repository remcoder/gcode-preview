/* eslint-env node */
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import {terser} from 'rollup-plugin-terser';
import resolve from 'rollup-plugin-node-resolve';

export default {
 input: 'src/gcode-preview.ts', // our source file
 output: [
  {
   file: pkg.module,
   format: 'es' // the preferred format
  },
  {
   file: pkg.browser,
   format: 'umd',
   name: 'GCodePreview', // the global which can be used in a browser
   globals: {
    'three': 'THREE',
    'three-orbitcontrols': "THREE.OrbitControls"
   }
  }
 ],
 external: [
  ...Object.keys(pkg.dependencies || {})
 ],
 plugins: [
  resolve(),
  typescript({
   typescript: require('typescript'),
  }),
  terser() // minifies generated bundles
 ]
};