import { defineConfig } from 'vite';
import { offlineData } from './tools/offline_data.mjs';

// 网站：npm run dev / npm run build。离线版（U 盘上双击打开）：node tools/build_offline.mjs（vite build --mode offline，再合成一个 HTML）
// 出的代码按哪些浏览器写：Vite 8 默认是 iOS 16.4 / Chrome 111，three.js 里的 class static 块会原样留着，
// iOS 15、16.0–16.3 的 iPhone（6s、7、SE 一代最高只能升到 iOS 15）一解析就报错、整页打不开。降到 iOS 15 / Chrome 87：
// 再往下没意义——three.js 要 WebGL2，Safari 15 才默认打开
const target = ['chrome87', 'edge88', 'firefox78', 'safari15', 'ios15'];

export default defineConfig(({ mode }) => ({
  define: { __APP_BUILD__: JSON.stringify(new Date().toISOString()) },
  server: { port: 5188, host: '127.0.0.1' },
  plugins: [offlineData(mode === 'offline')],
  build: { target },
  ...(mode === 'offline' && {
    base: './',
    publicDir: false,
    build: { target, outDir: 'dist-offline', emptyOutDir: true, assetsInlineLimit: () => true, modulePreload: false, chunkSizeWarningLimit: 20000, rolldownOptions: { output: { codeSplitting: false } } },          // 一个文件：双击打开的网页不能再去加载别的模块文件
  }),
}));
