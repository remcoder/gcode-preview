import { createApp, ref, watch, nextTick } from 'vue';
import { settingsPresets as presets } from './presets.js';
import * as GCodePreview from 'gcode-preview';

import { humanFileSize } from './utils.js';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const initialBackgroundColor = preferDarkMode.matches ? '#111' : '#eee';
const statsContainer = () => document.querySelector('.sidebar');
const initialCameraPosition = [-250, 350, 300];
const loadProgressive = true;

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
    const renderExtrusion = ref(true);
    const lineWidth = ref(0.4);
    const renderTubes = ref(true);
    const tubeWidth = ref(0.4);
    const colors = ref(['#ff0000', '#00ff00', '#0000ff', '#ffff00']);
    const highlightTopLayer = ref(false);
    const topLayerColor = ref('#40BFBF');
    const highlightLastSegment = ref(false);
    const lastSegmentColor = ref('#FFFFFF');
    const drawBuildVolume = ref(true);
    const buildVolume = ref({ x: 180, y: 180, z: 100 });
    const backgroundColor = ref(initialBackgroundColor);
    const thumbnail = ref(null);
    const layerCount = ref(0);
    const fileSize = ref(0);

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

    watch(renderExtrusion, (enabled) => {
      if (!watching.value) return;
      preview.renderExtrusion = enabled;
      preview.render();
    });

    watch(lineWidth, (value) => {
      if (!watching.value) return;
      preview.lineWidth = +value;
      preview.render();
    });

    watch(renderTubes, (enabled) => {
      if (!watching.value) return;
      preview.renderTubes = enabled;
      preview.render();
    });

    watch(tubeWidth, (value) => {
      if (!watching.value) return;
      preview.extrusionWidth = +value;
      preview.render();
    });

    watch(
      colors,
      (value) => {
        if (!watching.value) return;
        preview.extrusionColor = value.length === 1 ? value[0] : value;
        preview.render();
      },
      { deep: true }
    );

    watch(highlightTopLayer, (enabled) => {
      if (!watching.value) return;
      preview.topLayerColor = enabled ? topLayerColor.value : undefined;
      preview.render();
    });

    watch(topLayerColor, (color) => {
      if (!watching.value) return;
      preview.topLayerColor = color;
      preview.render();
    });

    watch(highlightLastSegment, (enabled) => {
      if (!watching.value) return;
      preview.lastSegmentColor = enabled ? lastSegmentColor.value : undefined;
      preview.render();
    });

    watch(lastSegmentColor, (color) => {
      if (!watching.value) return;
      preview.lastSegmentColor = color;
      preview.render();
    });

    watch(drawBuildVolume, (enabled) => {
      if (!watching.value) return;
      preview.buildVolume = enabled ? buildVolume.value : undefined;
      preview.render();
    });

    watch(
      buildVolume,
      (value) => {
        if (!watching.value) return;
        preview.buildVolume = value;
        preview.render();
      },
      { deep: true }
    );

    watch(backgroundColor, (color) => {
      if (!watching.value) return;
      preview.backgroundColor = color;
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
      renderTravel,
      renderExtrusion,
      lineWidth,
      renderTubes,
      tubeWidth,
      colors,
      highlightTopLayer,
      topLayerColor,
      highlightLastSegment,
      lastSegmentColor,
      drawBuildVolume,
      buildVolume,
      backgroundColor,
      thumbnail,
      layerCount,
      fileSize
    };
  },
  mounted() {
    selectPreset(defaultPreset);
  },
  methods: {
    selectTab(t) {
      this.activeTab = t;
    },
    addColor() {
      this.colors.push('#000000'); // TODO: random color
    },
    removeColor() {
      this.colors.pop();
    }
  }
}).mount('#app'));

async function selectPreset(preset, options) {
  const canvas = document.querySelector('canvas');
  const defaultOpts = {
    canvas,
    initialCameraPosition,
    backgroundColor: initialBackgroundColor,
    lineHeight: 0.3,
    devMode: Object.assign({}, devMode, { statsContainer: statsContainer() }) // delay stats container selection until it's available in the DOM (Vue)
  };
  const settings = presets[preset];
  Object.assign(defaultOpts, settings, options ?? {});
  preview = new GCodePreview.init(defaultOpts);
  await loadGCodeFromServer(settings.file);

  app.thumbnail = preview.parser.metadata.thumbnails['220x124'].src;
  app.layerCount = preview.layers.length;

  app.watching = false;

  // reset UI to default values
  app.maxLayer = preview.layers.length;
  app.endLayer = preview.layers.length;
  preview.endLayer = preview.layers.length;
  app.singleLayerMode = false;
  app.renderTravel = false;
  app.renderExtrusion = true;
  app.lineWidth = 0.4;
  app.renderTubes = true;
  app.tubeWidth = 0.4;
  app.colors = preview.extrusionColor.map((c) => '#' + c.getHexString());
  app.topLayerColor = '#' + preview.topLayerColor?.getHexString();
  app.highlightTopLayer = !!preview.topLayerColor;
  app.lastSegmentColor = '#' + preview.lastSegmentColor?.getHexString();
  app.highlightLastSegment = !!preview.lastSegmentColor;
  app.buildVolume = preview.buildVolume;
  app.drawBuildVolume = !!preview.buildVolume;
  app.backgroundColor = '#' + preview.backgroundColor.getHexString();

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
  app.fileSize = humanFileSize(gcode.length);

  startLoadingProgressive(gcode);
}

async function startLoadingProgressive(gcode) {
  preview.clear();
  if (loadProgressive) {
    preview.parser.parseGCode(gcode);
    await preview.renderAnimated(Math.ceil(preview.layers.length / 60));
  } else {
    preview.processGCode(gcode);
  }
}
