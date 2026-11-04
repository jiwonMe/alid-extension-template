import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: false,
    sourcemap: false,
    lib: { entry: 'src/index.js', formats: ['es'], fileName: () => 'plugin.js' },
    // Keep a single self-contained ESM file: Blob URLs cannot resolve ./chunks.
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
