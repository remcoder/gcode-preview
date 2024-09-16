import { createApp, ref, watch } from 'vue';
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

    watch(selectedPreset, (preset) => {
      selectPreset(preset);
    });

    watch(startLayer, (layer) => {
      preview.startLayer = +layer;
      // TODO: move clamping into library
      endLayer.value = preview.endLayer = Math.max(preview.startLayer, preview.endLayer);
      preview.renderAnimated();
    });

    watch(endLayer, (layer) => {
      preview.endLayer = +layer;
      // TODO: move clamping into library
      startLayer.value = preview.startLayer = Math.min(preview.startLayer, preview.endLayer);
      preview.renderAnimated();
    });

    return {
      selectedPreset,
      presets: ref(presets),
      activeTab,
      startLayer,
      endLayer,
      maxLayer
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
  app.maxLayer = preview.layers.length;
  app.endLayer = preview.layers.length;
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
