import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  plugins: [vue(), VueDevTools({
    // launchEditor: 'D:\\Trae CN\\bin\\trae-launcher.bat', // 自定义脚本，同时打开webstorm和Trae CN
    launchEditor: 'webstorm64', // 关键：点击组件时自动打开 webstorm
  })]
});