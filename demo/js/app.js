import { createApp, ref } from 'vue';
import { settingsPresets } from './presets.js';

export const app = () =>
  createApp({
    setup() {
      const presets = ref(settingsPresets);
      const activeTab = ref('layers');
      return {
        presets,
        activeTab
      };
    },
    methods: {
      selectTab(t) {
        console.log(t, this.activeTab);
        this.activeTab = t;
      }
    }
  }).mount('#app');
