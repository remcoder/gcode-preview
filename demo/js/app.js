import { createApp, ref } from 'vue';
import { settingsPresets } from './presets.js';
import * as GCodePreview from 'gcode-preview';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const initialBackgroundColor = preferDarkMode.matches ? '#111' : '#eee';
const canvasElement = document.querySelector('canvas');

export const app = () =>
  createApp({
    setup() {
      const presets = ref(settingsPresets);
      const activeTab = ref('layers');

      return {
        defaultPreset: ref(defaultPreset),
        presets,
        activeTab
      };
    },
    mounted() {
      this.selectPreset(this.defaultPreset);
    },
    methods: {
      selectTab(t) {
        console.log(t, this.activeTab);
        this.activeTab = t;
      },
      selectPreset(preset) {
        console.log(preset);
        this.settings = this.presets[preset];

        window.preview = new GCodePreview.init({
          canvas: canvasElement,
          buildVolume: undefined, //{ ...preset.buildVolume },
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
        });

        loadGCodeFromServer(this.settings.file);
      }
    }
  }).mount('#app');

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
