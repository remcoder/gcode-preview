<template>
  <div>
    <canvas ref="preview"></canvas>
    
    <div>topLayerColor: {{topLayerColor}}</div>
    <div>lastSegmentColor: {{lastSegmentColor}}</div>
    <div>endLayer: {{endLayer}}</div>
    <div>startLayer: {{startLayer}}</div>
    <div>lineWidth: {{lineWidth}}</div>
  </div>
</template>

<script>
'use strict'

import { WebGLPreview } from 'gcode-preview';
import * as THREE from 'three';

export default {
  props: {
    topLayerColor: String,
    lastSegmentColor: String,
    endLayer: Number,
    startLayer: Number,
    lineWidth: Number
  },

  data() {
    return {
      layerCount: 0
    }
  },

  mounted() {
    this.preview = new WebGLPreview({
      canvas: this.$refs.preview,
      endLayer: this.endLayer,
      startLayer: this.startLayer,
      topLayerColor: new THREE.Color(this.topLayerColor).getHex(),
      lastSegmentColor: new THREE.Color(this.lastSegmentColor).getHex(),
      lineWidth: this.lineWidth
    });

    window.addEventListener('resize', () => {
      this.preview.resize();
    });
  },

  methods: {
    processGCode(gcode) {
      this.preview.processGCode(gcode);
      this.layerCount = this.preview.layers.length;
    }
  }
}
</script>
<style scoped>
  canvas {
    outline: none;
    width: 100%;
    height: 100%;
  }
</style>