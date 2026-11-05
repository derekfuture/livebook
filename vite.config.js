import { defineConfig } from 'vite';
import { offlineData } from './tools/offline_data.mjs';

// 网站：npm run dev / npm run build。离线版（U 盘上双击打开）：node tools/build_offline.mjs（vite build --mode offline，再合成一个 HTML）
export default defineConfig(({ mode }) => ({
  server: { port: 5188, host: '127.0.0.1' },
  plugins: [offlineData(mode === 'offline')],
  ...(mode === 'offline' && {
    base: './',
    publicDir: false,
    build: { outDir: 'dist-offline', emptyOutDir: true, assetsInlineLimit: () => true, modulePreload: false, chunkSizeWarningLimit: 20000, rolldownOptions: { output: { codeSplitting: false } } },          // 一个文件：双击打开的网页不能再去加载别的模块文件
  }),
}));
