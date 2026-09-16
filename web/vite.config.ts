import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // 读取仓库根 .env：API_PORT（后端）/ WEB_PORT（前端，留空则单端口模式）
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const apiPort = process.env.API_PORT || env.API_PORT || '3000';
  const webPort = process.env.WEB_PORT || env.WEB_PORT || '5173';

  return {
    plugins: [vue(), tailwindcss()],
    // .env 放仓库根（与后端共用），VITE_API_BASE_URL 在此注入客户端代码
    envDir: path.resolve(__dirname, '..'),
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: Number(webPort),
      proxy: { '/api': `http://localhost:${apiPort}` },
    },
    preview: {
      port: Number(webPort),
      proxy: { '/api': `http://localhost:${apiPort}` },
    },
  };
});
