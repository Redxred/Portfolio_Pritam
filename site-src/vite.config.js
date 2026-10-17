import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/',
  build: {
    outDir: '../pritamnathdipta.online',
    emptyOutDir: false,
    assetsDir: 'assets',
    target: 'es2020',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        cv: fileURLToPath(new URL('./cv.html', import.meta.url))
      }
    }
  }
});
