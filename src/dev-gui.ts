import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

export type DevModeOptions = {
  camera?: boolean | false;
  renderer?: boolean | false;
  parser?: boolean | false;
  buildVolume?: boolean | false;
};

class DevGUI {
  private gui: GUI;
  private watchedObject;
  private options?: DevModeOptions | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(watchedObject: any, options?: DevModeOptions | undefined) {
    this.watchedObject = watchedObject;
    this.options = options;

    this.gui = new GUI();
    this.gui.title('Dev info');

    this.setup();
  }

  setup(): void {
    if (!this.options || this.options.renderer) {
      this.setupRedererFolder();
    }

    if (!this.options || this.options.camera) {
      this.setupCameraFolder();
    }

    if (!this.options || this.options.parser) {
      this.setupParserFolder();
    }

    if (!this.options || this.options.buildVolume) {
      this.setupBuildVolumeFolder();
    }
  }

  reset(): void {
    this.gui.destroy();
    this.gui = new GUI();
    this.gui.title('Dev info');
    this.setup();
  }

  private setupRedererFolder(): void {
    const render = this.gui.addFolder('Render Info').close();
    render.add(this.watchedObject.renderer.info.render, 'triangles').listen();
    render.add(this.watchedObject.renderer.info.render, 'calls').listen();
    render.add(this.watchedObject.renderer.info.render, 'lines').listen();
    render.add(this.watchedObject.renderer.info.render, 'points').listen();
    render.add(this.watchedObject.renderer.info.memory, 'geometries').listen();
    render.add(this.watchedObject.renderer.info.memory, 'textures').listen();
    render.add(this.watchedObject, '_lastRenderTime').listen();
  }

  private setupCameraFolder(): void {
    const camera = this.gui.addFolder('Camera').close();
    const cameraPosition = camera.addFolder('Camera position');
    cameraPosition.add(this.watchedObject.camera.position, 'x').listen();
    cameraPosition.add(this.watchedObject.camera.position, 'y').listen();
    cameraPosition.add(this.watchedObject.camera.position, 'z').listen();

    const cameraRotation = camera.addFolder('Camera rotation');
    cameraRotation.add(this.watchedObject.camera.rotation, 'x').listen();
    cameraRotation.add(this.watchedObject.camera.rotation, 'y').listen();
    cameraRotation.add(this.watchedObject.camera.rotation, 'z').listen();
  }

  private setupParserFolder(): void {
    const parser = this.gui.addFolder('Parser').close();
    parser.add(this.watchedObject.parser, 'curZ').listen();
    parser.add(this.watchedObject.parser, 'maxZ').listen();
    parser.add(this.watchedObject.parser, 'tolerance').listen();
    parser.add(this.watchedObject.parser.layers, 'length').name('layers.count').listen();
    parser.add(this.watchedObject.parser.lines, 'length').name('lines.count').listen();
  }

  private setupBuildVolumeFolder(): void {
    const buildVolume = this.gui.addFolder('Build Volume').close();
    buildVolume
      .add(this.watchedObject.buildVolume, 'x')
      .min(0)
      .max(600)
      .listen()
      .onChange(() => {
        this.watchedObject.render();
      });
    buildVolume
      .add(this.watchedObject.buildVolume, 'y')
      .min(0)
      .max(600)
      .listen()
      .onChange(() => {
        this.watchedObject.render();
      });
    buildVolume
      .add(this.watchedObject.buildVolume, 'z')
      .min(0)
      .max(600)
      .listen()
      .onChange(() => {
        this.watchedObject.render();
      });
  }
}

export { DevGUI };
