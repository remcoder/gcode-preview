import { type GCodePreviewOptions, WebGLPreview } from './webgl-preview';

import { type DevModeOptions } from './dev-gui';
const init = function (opts: GCodePreviewOptions) {
  return new WebGLPreview(opts);
};
export { WebGLPreview, init, DevModeOptions, GCodePreviewOptions };
