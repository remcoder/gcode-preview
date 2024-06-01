import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

export type DevModeOptions = {
  camera?: boolean | false;
  renderer?: boolean | false;
};

class DevGUI {
  private gui: GUI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private watchedObject;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(watchedObject: any, options?: DevModeOptions | undefined) {
    this.gui = new GUI();
    this.gui.title('Dev info');
    this.watchedObject = watchedObject;

    if (!options || options.renderer) {
      this.setupRedererFolder();
    }

    if (!options || options.camera) {
      this.setupCameraFolder();
    }
  }

  private setupRedererFolder(): void {
    const render = this.gui.addFolder('Render Info');
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
}

export { DevGUI };
