import { WebGLPreviewOptions, WebGLPreview } from './webgl-preview';
import { Layer, Parser } from './gcode-parser';

import { BuildVolume } from './buildVolume';
import { DevGUI, DevModeOptions } from './dev-gui';

export { WebGLPreview, DevModeOptions };

export type GCodePreviewOptions = WebGLPreviewOptions & { test: boolean } & DevModeOptions;

export class GCodePreview {
  webglPreview?: WebGLPreview;
  opts: GCodePreviewOptions;
  parser: Parser;
  private devGui?: DevGUI;
  devMode: boolean | DevModeOptions;

  constructor(opts: GCodePreviewOptions) {
    this.opts = opts;
    this.parser = new Parser();
    this.webglPreview = new WebGLPreview(this.opts);
    this.devMode = opts.devMode ?? this.devMode;

    if (this.devMode) {
      this.initGui();
    }
  }

  get buildVolume(): BuildVolume {
    return this.webglPreview.buildVolume;
  }

  get layers(): Layer[] {
    return [this.parser.preamble].concat(this.parser.layers.concat());
  }

  clear(): void {
    this.parser.clear();
    this.webglPreview.clear();
    this.devGui?.clear();
  }

  resize(): void {
    this.webglPreview.resize();
  }

  processGCode(gcode: string): void {
    const { layers } = this.parser.parseGCode(gcode);
    this.webglPreview.layers = layers;
    this.webglPreview.render();
  }

  render(): void {
    this.webglPreview.render();
  }

  set renderTubes(value: boolean) {
    this.webglPreview.renderTubes = value;
  }

  private initGui() {
    if (typeof this.devMode === 'boolean' && this.devMode === true) {
      this.devGui = new DevGUI(this);
    } else if (typeof this.devMode === 'object') {
      this.devGui = new DevGUI(this, this.devMode);
    }
  }
}
