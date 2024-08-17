import { GUI } from 'lil-gui';

export type DevModeOptions = {
  camera?: boolean | false;
  renderer?: boolean | false;
  parser?: boolean | false;
  buildVolume?: boolean | false;
  devHelpers?: boolean | false;
  statsContainer?: HTMLElement | undefined;
};

class DevGUI {
  private gui: GUI;
  private watchedObject;
  private options?: DevModeOptions | undefined;
  private openFolders: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(watchedObject: any, options?: DevModeOptions | undefined) {
    this.watchedObject = watchedObject;
    this.options = options;

    this.gui = new GUI();
    this.gui.title('Dev info');

    this.setup();
  }

  setup(): void {
    this.loadOpenFolders();
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

    if (!this.options || this.options.devHelpers) {
      this.setupDevHelpers();
    }
  }

  reset(): void {
    this.gui.destroy();
    this.gui = new GUI();
    this.gui.title('Dev info');
    this.setup();
  }

  loadOpenFolders(): void {
    this.openFolders = JSON.parse(localStorage.getItem('dev-gui-open') || '{}').open || [];
  }

  saveOpenFolders(): void {
    this.openFolders = this.gui
      .foldersRecursive()
      .filter((folder) => {
        return !folder._closed;
      })
      .map((folder) => {
        return folder._title;
      });
    console.log(this.openFolders);
    localStorage.setItem('dev-gui-open', JSON.stringify({ open: this.openFolders }));
  }

  private setupRedererFolder(): void {
    const render = this.gui.addFolder('Render Info');
    if (!this.openFolders.includes('Render Info')) {
      render.close();
    }
    render.onOpenClose(() => {
      this.saveOpenFolders();
    });
    render.add(this.watchedObject.renderer.info.render, 'triangles').listen();
    render.add(this.watchedObject.renderer.info.render, 'calls').listen();
    render.add(this.watchedObject.renderer.info.render, 'lines').listen();
    render.add(this.watchedObject.renderer.info.render, 'points').listen();
    render.add(this.watchedObject.renderer.info.memory, 'geometries').listen();
    render.add(this.watchedObject.renderer.info.memory, 'textures').listen();
    render.add(this.watchedObject, '_lastRenderTime').listen();
  }

  private setupCameraFolder(): void {
    const camera = this.gui.addFolder('Camera');
    if (!this.openFolders.includes('Camera')) {
      camera.close();
    }
    camera.onOpenClose(() => {
      this.saveOpenFolders();
    });
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
    const parser = this.gui.addFolder('Parser');
    if (!this.openFolders.includes('Parser')) {
      parser.close();
    }
    parser.onOpenClose(() => {
      this.saveOpenFolders();
    });
    parser.add(this.watchedObject.parser, 'curZ').listen();
    parser.add(this.watchedObject.parser, 'maxZ').listen();
    parser.add(this.watchedObject.parser, 'tolerance').listen();
    parser.add(this.watchedObject.parser.layers, 'length').name('layers.count').listen();
    parser.add(this.watchedObject.parser.lines, 'length').name('lines.count').listen();
  }

  private setupBuildVolumeFolder(): void {
    if (!this.watchedObject.buildVolume) {
      return;
    }
    const buildVolume = this.gui.addFolder('Build Volume');
    if (!this.openFolders.includes('Build Volume')) {
      buildVolume.close();
    }
    buildVolume.onOpenClose(() => {
      this.saveOpenFolders();
    });
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

  private setupDevHelpers(): void {
    const devHelpers = this.gui.addFolder('Dev Helpers');
    if (!this.openFolders.includes('Dev Helpers')) {
      devHelpers.close();
    }
    devHelpers.onOpenClose(() => {
      this.saveOpenFolders();
    });
    devHelpers
      .add(this.watchedObject, '_wireframe')
      .listen()
      .onChange(() => {
        this.watchedObject.render();
      });
    devHelpers.add(this.watchedObject, 'render').listen();
    devHelpers.add(this.watchedObject, 'clear').listen();
  }
}

export { DevGUI };
