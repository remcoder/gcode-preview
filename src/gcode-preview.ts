import { GCodePreviewOptions, WebGLPreview,  } from './webgl-preview';

const init = function(opts: GCodePreviewOptions) { return new WebGLPreview(opts) };
export { WebGLPreview, init }
