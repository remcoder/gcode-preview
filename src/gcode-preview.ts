import { GCodePreviewOptions, WebGLPreview, BuildVolume } from './webgl-preview';
import { Parser } from './gcode-parser';
import { Thumbnail } from './thumbnail';
const init = function (opts: GCodePreviewOptions) {
  return new WebGLPreview(opts);
};
export { WebGLPreview, init, GCodePreviewOptions, BuildVolume, Parser, Thumbnail };
