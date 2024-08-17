import { createApp, ref } from 'vue';

export const app = () =>
  createApp({
    setup() {
      const message = ref('Hello Vue!');
      return {
        message
      };
    }
  }).mount('#app');
