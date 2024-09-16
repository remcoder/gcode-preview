import { createApp, ref, watch, nextTick } from 'vue';
import { settingsPresets as presets } from './presets.js';
import * as GCodePreview from 'gcode-preview';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const backgroundColor = preferDarkMode.matches ? '#111' : '#eee';
const canvas = document.querySelector('canvas');
const statsContainer = document.querySelector('.sidebar');
const initialCameraPosition = [-250, 350, 300];

const devMode = {
  camera: true,
  renderer: true,
  parser: true,
  buildVolume: true,
  devHelpers: true,
  statsContainer
};

let preview = null;

export const app = (window.app = createApp({
  setup() {
    const activeTab = ref('layers');
    const selectedPreset = ref(defaultPreset);
    const startLayer = ref(1);
    const endLayer = ref(1);
    const maxLayer = ref(1000000); // Infinity doesn't work
    const singleLayerMode = ref(false);
    const watching = ref(false);
    const renderTravel = ref(false);

    watch(selectedPreset, (preset) => {
      selectPreset(preset);
    });

    watch(startLayer, (layer) => {
      if (!watching.value) return;

      preview.startLayer = +layer;
      // TODO: move clamping into library
      endLayer.value = preview.endLayer = Math.max(preview.startLayer, preview.endLayer);
      preview.render();
    });

    watch(endLayer, (layer) => {
      if (!watching.value) return;

      preview.endLayer = +layer;
      // TODO: move clamping into library
      startLayer.value = preview.startLayer = Math.min(preview.startLayer, preview.endLayer);
      preview.render();
    });

    watch(singleLayerMode, (enabled) => {
      if (!watching.value) return;
      preview.singleLayerMode = enabled;
      preview.render();
    });

    watch(renderTravel, (enabled) => {
      if (!watching.value) return;
      preview.renderTravel = enabled;
      preview.render();
    });

    return {
      selectedPreset,
      presets,
      activeTab,
      startLayer,
      endLayer,
      maxLayer,
      singleLayerMode,
      watching,
      renderTravel
    };
  },
  mounted() {
    selectPreset(defaultPreset);
  },
  methods: {
    selectTab(t) {
      this.activeTab = t;
    }
  }
}).mount('#app'));

async function selectPreset(preset, options) {
  const defaultOpts = {
    canvas,
    initialCameraPosition,
    backgroundColor,
    lineHeight: 0.3,
    devMode
  };
  const settings = presets[preset];
  Object.assign(defaultOpts, settings, options ?? {});
  preview = new GCodePreview.init(defaultOpts);

  await loadGCodeFromServer(settings.file);

  app.watching = false;
  app.maxLayer = preview.layers.length;
  app.endLayer = preview.layers.length;
  app.singleLayerMode = false;
  app.renderTravel = false;
  preview.endLayer = preview.layers.length;
  // prevent an extra render
  nextTick(() => {
    app.watching = true;
  });
}

async function loadGCodeFromServer(filename) {
  const response = await fetch(filename);
  if (response.status !== 200) {
    console.error('ERROR. Status Code: ' + response.status);
    return;
  }

  const gcode = await response.text();
  startLoadingProgressive(gcode);
}

async function startLoadingProgressive(gcode) {
  preview.clear();
  if (true) {
    preview.parser.parseGCode(gcode);
    await preview.renderAnimated(Math.ceil(preview.layers.length / 60));
  } else {
    preview.processGCode(gcode);
  }
}
