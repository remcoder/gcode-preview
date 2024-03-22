import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.ts'],
    environment: 'happy-dom',
    globals: true
  }
});
