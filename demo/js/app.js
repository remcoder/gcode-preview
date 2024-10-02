import { createApp, ref, watch, nextTick, onMounted } from 'vue';
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
    const watching = ref(false);
    const thumbnail = ref(null);
    const layerCount = ref(0);
    const fileSize = ref(0);
    const dragging = ref(false);

    const settings = ref(Object.assign({}, defaultSettings));

    watch(selectedPreset, (preset) => {
      selectPreset(preset);
    });

    watch(
      () => settings.value.startLayer,
      (layer) => {
        if (!watching.value) return;

        preview.startLayer = +layer;
        // TODO: move clamping into library
        settings.value.endLayer = preview.endLayer = Math.max(preview.startLayer, preview.endLayer);
        preview.render();
      }
    );

    watch(
      () => settings.value.endLayer,
      (layer) => {
        if (!watching.value) return;

        preview.endLayer = +layer;
        // TODO: move clamping into library
        settings.value.startLayer = preview.startLayer = Math.min(preview.startLayer, preview.endLayer);
        preview.render();
      }
    );

    watch(
      () => settings.value.singleLayerMode,
      (enabled) => {
        if (!watching.value) return;
        preview.singleLayerMode = enabled;
        preview.render();
      }
    );

    watch(
      () => settings.value.renderTravel,
      (enabled) => {
        if (!watching.value) return;
        preview.renderTravel = enabled;
        preview.render();
      }
    );

    watch(
      () => settings.value.travelColor,
      (color) => {
        if (!watching.value) return;
        preview.travelColor = color;
        preview.render();
      }
    );

    watch(
      () => settings.value.renderExtrusion,
      (enabled) => {
        if (!watching.value) return;
        preview.renderExtrusion = enabled;
        preview.render();
      }
    );

    watch(
      () => settings.value.lineWidth,
      (value) => {
        if (!watching.value) return;
        preview.lineWidth = +value;
        preview.render();
      }
    );

    watch(
      () => settings.value.renderTubes,
      (enabled) => {
        if (!watching.value) return;
        preview.renderTubes = enabled;
        preview.render();
      }
    );

    watch(
      () => settings.value.tubeWidth,
      (value) => {
        if (!watching.value) return;
        preview.extrusionWidth = +value;
        preview.render();
      }
    );

    watch(
      () => settings.value.colors,
      (value) => {
        if (!watching.value) return;
        preview.extrusionColor = value.length === 1 ? value[0] : value;
        preview.render();
      },
      { deep: true }
    );

    watch(
      () => settings.value.highlightTopLayer,
      (enabled) => {
        if (!watching.value) return;
        preview.topLayerColor = enabled ? settings.value.topLayerColor : undefined;
        preview.render();
      }
    );

    watch(
      () => settings.value.topLayerColor,
      (color) => {
        if (!watching.value) return;
        preview.topLayerColor = color;
        preview.render();
      }
    );

    watch(
      () => settings.value.highlightLastSegment,
      (enabled) => {
        if (!watching.value) return;
        preview.lastSegmentColor = enabled ? settings.value.lastSegmentColor : undefined;
        preview.render();
      }
    );

    watch(
      () => settings.value.lastSegmentColor,
      (color) => {
        if (!watching.value) return;
        preview.lastSegmentColor = color;
        preview.render();
      }
    );

    watch(
      () => settings.value.drawBuildVolume,
      (enabled) => {
        if (!watching.value) return;
        preview.buildVolume = enabled ? settings.value.buildVolume : undefined;
        preview.render();
      }
    );

    watch(
      () => settings.value.buildVolume,
      (value) => {
        if (!watching.value) return;
        preview.buildVolume = value;
        preview.render();
      },
      { deep: true }
    );

    watch(
      () => settings.value.backgroundColor,
      (color) => {
        if (!watching.value) return;
        preview.backgroundColor = color;
        preview.render();
      }
    );

    const selectTab = (t) => {
      console.log('selectTab', t);
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
      console.log('drop', evt.dataTransfer.files);
      dragging.value = false;

      const files = evt.dataTransfer.files;
      const file = files[0];

      this.loadDroppedFile(file);
    };

    const resetUI = () => {
      console.log('resetUI');
      thumbnail.value = preview.parser.metadata.thumbnails['220x124']?.src;
      layerCount.value = preview.layers.length;

      watching.value = false;

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

      // prevent an extra render
      nextTick(() => {
        watching.value = true;
      });
    };

    const loadGCodeFromServer = async (filename) => {
      console.log('loadGCodeFromServer', filename);
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
        await preview.renderAnimated(Math.ceil(preview.layers.length / 60));
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
      console.log('selectPreset', presetName);
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

    onMounted(() => {
      selectPreset(defaultPreset);
    });

    return {
      presets,
      activeTab,
      selectedPreset,
      watching,
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
  },
  mounted() {
    this.selectPreset(defaultPreset);
  }
}).mount('#app'));
