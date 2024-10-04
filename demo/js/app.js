import { createApp, ref, watch, onMounted, watchEffect } from 'vue';
import { presets } from './presets.js';
import * as GCodePreview from 'gcode-preview';
import { defaultSettings } from './default-settings.js';
import { humanFileSize, readFile } from './utils.js';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const initialBackgroundColor = preferDarkMode.matches ? '#141414' : '#eee';
const statsContainer = () => document.querySelector('.sidebar');

const loadProgressive = true;
let observer = null;
let preview = null;

export const app = (window.app = createApp({
  setup() {
    const activeTab = ref('layers');
    const selectedPreset = ref(defaultPreset);
    const thumbnail = ref(null);
    const layerCount = ref(0);
    const fileSize = ref(0);
    const dragging = ref(false);
    const settings = ref(Object.assign({}, defaultSettings));

    watch(selectedPreset, (preset) => {
      selectPreset(preset);
    });

    const selectTab = (tab) => (activeTab.value = tab);

    const addColor = () => settings.value.colors.push('#000000'); // TODO: random color

    const removeColor = () => settings.value.colors.pop();

    const dragOver = (event) => {
      event.dataTransfer.dropEffect = 'copy';
      dragging.value = true;
    };

    const dragLeave = () => (dragging.value = false);

    const drop = (event) => {
      dragging.value = false;
      const file = event.dataTransfer.files[0];
      loadDroppedFile(file);
    };

    // Update UI with current preview settings
    const updateUI = async () => {
      const {
        parser,
        layers,
        extrusionColor,
        topLayerColor,
        lastSegmentColor,
        buildVolume,
        backgroundColor,
        singleLayerMode,
        renderTravel,
        travelColor,
        renderExtrusion,
        lineWidth,
        renderTubes,
        extrusionWidth
      } = preview;
      const { thumbnails } = parser.metadata;

      thumbnail.value = thumbnails['220x124']?.src;
      layerCount.value = layers.length;
      const colors = extrusionColor instanceof Array ? extrusionColor : [extrusionColor];
      const currentSettings = {
        maxLayer: layers.length,
        endLayer: layers.length,
        singleLayerMode,
        renderTravel,
        travelColor: '#' + travelColor.getHexString(),
        renderExtrusion,
        lineWidth,
        renderTubes,
        extrusionWidth,
        colors: colors.map((c) => '#' + c.getHexString()),
        topLayerColor: '#' + topLayerColor?.getHexString(),
        highlightTopLayer: !!topLayerColor,
        lastSegmentColor: '#' + lastSegmentColor?.getHexString(),
        highlightLastSegment: !!lastSegmentColor,
        buildVolume: buildVolume,
        drawBuildVolume: !!buildVolume,
        backgroundColor: '#' + backgroundColor.getHexString()
      };

      Object.assign(settings.value, currentSettings);
      preview.endLayer = layers.length;
    };

    const loadGCodeFromServer = async (filename) => {
      const response = await fetch(filename);
      if (response.status !== 200) {
        console.error('ERROR. Status Code: ' + response.status);
        return;
      }

      const gcode = await response.text();
      fileSize.value = humanFileSize(gcode.length);
      startLoadingProgressive(gcode);
    };

    const startLoadingProgressive = async (gcode) => {
      preview.clear();
      if (loadProgressive) {
        preview.parser.parseGCode(gcode);
        // await preview.renderAnimated(Math.ceil(preview.layers.length / 60));
      } else {
        preview.processGCode(gcode);
      }
    };

    const loadDroppedFile = async (file) => {
      fileSize.value = humanFileSize(file.size);
      const content = await readFile(file);
      startLoadingProgressive(content);
      updateUI();
    };

    const selectPreset = async (presetName) => {
      const canvas = document.querySelector('canvas.preview');
      const preset = presets[presetName];
      const options = Object.assign(
        {
          canvas,
          backgroundColor: initialBackgroundColor
        },
        defaultSettings,
        preset
      );

      // reset previous state
      const lilGuiElement = document.querySelector('.lil-gui');
      if (lilGuiElement) document.body.removeChild(lilGuiElement);
      const stats = document.querySelector('.stats');
      if (stats) stats.parentNode.removeChild(stats);
      if (defaultSettings.devMode) defaultSettings.devMode.statsContainer = statsContainer();
      preview?.dispose();

      preview = new GCodePreview.init(options);

      // resize preview on canvas resize (TODO: move to GCodePreview)
      if (observer) observer.disconnect();
      observer = new ResizeObserver(() => preview.resize());
      observer.observe(canvas);

      await loadGCodeFromServer(preset.file);
      updateUI();
    };

    onMounted(async () => {
      await selectPreset(defaultPreset);

      watchEffect(() => {
        preview.startLayer = +settings.value.startLayer;
        preview.endLayer = +settings.value.endLayer;
        preview.singleLayerMode = settings.value.singleLayerMode;
        preview.renderTravel = settings.value.renderTravel;
        preview.travelColor = settings.value.travelColor;
        preview.renderExtrusion = settings.value.renderExtrusion;
        preview.lineWidth = +settings.value.lineWidth;
        preview.renderTubes = settings.value.renderTubes;
        preview.extrusionWidth = +settings.value.extrusionWidth;
        preview.extrusionColor = settings.value.colors.length === 1 ? settings.value.colors[0] : settings.value.colors;
        preview.topLayerColor = settings.value.highlightTopLayer ? settings.value.topLayerColor : undefined;
        preview.lastSegmentColor = settings.value.highlightLastSegment ? settings.value.lastSegmentColor : undefined;
        preview.buildVolume = settings.value.drawBuildVolume ? settings.value.buildVolume : undefined;
        preview.backgroundColor = settings.value.backgroundColor;

        preview.render();
      });
    });

    return {
      presets,
      activeTab,
      selectedPreset,
      thumbnail,
      layerCount,
      fileSize,
      dragging,
      settings,
      selectTab,
      addColor,
      removeColor,
      dragOver,
      dragLeave,
      drop,
      resetUI: updateUI,
      loadGCodeFromServer,
      startLoadingProgressive,
      loadDroppedFile,
      selectPreset
    };
  }
}).mount('#app'));
