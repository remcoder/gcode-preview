import { createApp, ref, watch, nextTick, onMounted, watchEffect } from 'vue';
import { presets } from './presets.js';
import * as GCodePreview from 'gcode-preview';
import { defaultSettings } from './default-settings.js';

import { humanFileSize, readFile } from './utils.js';

const defaultPreset = 'multicolor';
const preferDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const initialBackgroundColor = preferDarkMode.matches ? '#111' : '#eee';
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

    const selectTab = (t) => {
      activeTab.value = t;
    };

    const addColor = () => {
      settings.value.colors.push('#000000'); // TODO: random color
    };

    const removeColor = () => {
      settings.value.colors.pop();
    };
    const dragOver = (evt) => {
      evt.dataTransfer.dropEffect = 'copy';
      dragging.value = true;
    };
    const dragLeave = () => {
      dragging.value = false;
    };
    const drop = (evt) => {
      dragging.value = false;

      const files = evt.dataTransfer.files;
      const file = files[0];

      this.loadDroppedFile(file);
    };

    const resetUI = async () => {
      thumbnail.value = preview.parser.metadata.thumbnails['220x124']?.src;
      layerCount.value = preview.layers.length;

      // reset UI to default values
      settings.value.maxLayer = preview.layers.length;
      settings.value.endLayer = preview.layers.length;
      preview.endLayer = preview.layers.length;

      settings.value.singleLayerMode = false;
      settings.value.renderTravel = false;
      settings.value.renderExtrusion = true;
      settings.value.lineWidth = 0.4;
      settings.value.renderTubes = true;
      settings.value.tubeWidth = 0.4;

      settings.value.colors = preview.extrusionColor.map((c) => '#' + c.getHexString());
      settings.value.topLayerColor = '#' + preview.topLayerColor?.getHexString();
      settings.value.highlightTopLayer = !!preview.topLayerColor;
      settings.value.lastSegmentColor = '#' + preview.lastSegmentColor?.getHexString();
      settings.value.highlightLastSegment = !!preview.lastSegmentColor;
      settings.value.buildVolume = preview.buildVolume;
      settings.value.drawBuildVolume = !!preview.buildVolume;
      settings.value.backgroundColor = '#' + preview.backgroundColor.getHexString();
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
        //await preview.renderAnimated(Math.ceil(preview.layers.length / 60));
      } else {
        preview.processGCode(gcode);
      }
    };

    const loadDroppedFile = async (file) => {
      this.fileSize = humanFileSize(file.size);

      // await preview._readFromStream(file.stream());

      const content = await readFile(file);

      startLoadingProgressive(content);

      resetUI();
    };
    const selectPreset = async (presetName) => {
      const canvas = document.querySelector('canvas');

      const preset = presets[presetName];
      const options = Object.assign(
        {
          canvas,
          statsContainer: statsContainer(),
          backgroundColor: initialBackgroundColor
        },
        defaultSettings,
        preset
      );

      preview = new GCodePreview.init(options);

      if (observer) observer.disconnect();
      observer = new ResizeObserver(() => preview.resize());
      observer.observe(canvas);

      await loadGCodeFromServer(preset.file);

      resetUI();
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
        preview.extrusionWidth = +settings.value.tubeWidth;
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
      resetUI,
      loadGCodeFromServer,
      startLoadingProgressive,
      loadDroppedFile,
      selectPreset
    };
  }
}).mount('#app'));
