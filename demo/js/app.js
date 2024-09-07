import { createApp, ref, watch } from 'vue';
import { settingsPresets as presets } from './presets.js';
import * as GCodePreview from 'gcode-preview';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const initialBackgroundColor = preferDarkMode.matches ? '#111' : '#eee';
const canvasElement = document.querySelector('canvas');

export const app = () =>
  createApp({
    setup() {
      const activeTab = ref('layers');
      const selectedPreset = ref(defaultPreset);

      watch(selectedPreset, (preset) => {
        selectPreset(preset);
      });

      return {
        selectedPreset,
        presets: ref(presets),
        activeTab
      };
    },
    mounted() {
      selectPreset(defaultPreset);
    },
    methods: {
      selectTab(t) {
        console.log(t, this.activeTab);
        this.activeTab = t;
      }
    }
  }).mount('#app');

function selectPreset(preset) {
  console.log('selectPreset', preset);
  const opts = {
    canvas: canvasElement,
    initialCameraPosition: [-250, 350, 300],
    backgroundColor: initialBackgroundColor,
    lineHeight: 0.3,
    devMode: {
      camera: true,
      renderer: true,
      parser: true,
      buildVolume: true,
      devHelpers: true,
      statsContainer: document.querySelector('.sidebar')
    }
  };
  const settings = presets[preset];
  Object.assign(opts, settings);
  window.preview = new GCodePreview.init(opts);

  loadGCodeFromServer(settings.file);
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
  window.preview.clear();
  if (true) {
    window.preview.parser.parseGCode(gcode);
    await window.preview.renderAnimated(Math.ceil(window.preview.layers.length / 60));
  } else {
    window.preview.processGCode(gcode);
  }
}
