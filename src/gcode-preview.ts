import { WebGLPreviewOptions, WebGLPreview } from './webgl-preview';
import { GCodeCommand, Parser } from './gcode-parser';
import { DevGUI, DevModeOptions } from './dev-gui';

type GCodePreviewOptions = WebGLPreviewOptions & { test: boolean } & DevModeOptions;
export class GCodePreview {
  webglPreview?: WebGLPreview;
  opts: GCodePreviewOptions;
  parser: Parser;
  private devGui?: DevGUI;
  devMode: boolean | DevModeOptions = false;

  constructor(opts: GCodePreviewOptions) {
    this.opts = opts;
    this.parser = new Parser();
    this.webglPreview = new WebGLPreview(this.opts);
    this.devMode = opts.devMode ?? this.devMode;

    this.initGui();
  }

  get buildVolume() {
    return this.webglPreview.buildVolume;
  }

  get layers(): GCodeCommand[][] {
    return this.parser.parsedGCode.layers;
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
    const { layers } = this.parser.parseGCode(gcode); // Not sure the layers paradigm is a good thing to keep around for all cases.
    this.webglPreview.layers = layers;
    this.webglPreview.parsedGCode = this.parser.parsedGCode;
    this.webglPreview.render();
  }

  render(): void {
    this.webglPreview.render();
  }

  set renderTubes(value: boolean) {
    this.webglPreview.renderTubes = value;
  }

  private initGui() {
    if (this.devMode === false) return;

    if (typeof this.devMode === 'boolean' && this.devMode === true) {
      this.devGui = new DevGUI(this);
    } else if (typeof this.devMode === 'object') {
      this.devGui = new DevGUI(this, this.devMode);
    }
  }
}
