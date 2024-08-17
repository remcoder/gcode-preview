import { createApp, ref } from 'vue';

export const app = () =>
  createApp({
    setup() {
      const activeTab = ref('layers');
      return {
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
