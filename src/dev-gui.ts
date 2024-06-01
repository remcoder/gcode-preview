import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Camera, WebGLRenderer } from 'three';

type GUIObjects = {
  camera?: Camera | undefined;
  renderer?: WebGLRenderer | undefined;
};

class DevGUI {
  private gui: GUI;
  private objects?: GUIObjects;
  constructor(objects: GUIObjects) {
    this.gui = new GUI();
    this.gui.title('Dev info');
    this.objects = objects;

    if (objects.renderer !== undefined) {
      this.setupRedererFolder();
    }

    if (objects.camera !== undefined) {
      this.setupCameraFolder();
    }
  }

  private setupRedererFolder(): void {
    const render = this.gui.addFolder('Render Info');
    render.add(this.objects.renderer.info.render, 'triangles').listen();
    render.add(this.objects.renderer.info.render, 'calls').listen();
    render.add(this.objects.renderer.info.render, 'lines').listen();
    render.add(this.objects.renderer.info.render, 'points').listen();
    render.add(this.objects.renderer.info.memory, 'geometries').listen();
    render.add(this.objects.renderer.info.memory, 'textures').listen();
  }

  private setupCameraFolder(): void {
    const camera = this.gui.addFolder('Camera').close();
    const cameraPosition = camera.addFolder('Camera position');
    cameraPosition.add(this.objects.camera.position, 'x').listen();
    cameraPosition.add(this.objects.camera.position, 'y').listen();
    cameraPosition.add(this.objects.camera.position, 'z').listen();

    const cameraRotation = camera.addFolder('Camera rotation');
    cameraRotation.add(this.objects.camera.rotation, 'x').listen();
    cameraRotation.add(this.objects.camera.rotation, 'y').listen();
    cameraRotation.add(this.objects.camera.rotation, 'z').listen();
  }
}

export { DevGUI };
