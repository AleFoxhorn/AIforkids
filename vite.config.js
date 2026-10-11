import { defineConfig, loadEnv } from 'vite';
import { materialApi } from './server/material-generation.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DASHSCOPE_');
  return {
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    preview: { host: '127.0.0.1' },
    plugins: [{ name: 'local-material-generation', configureServer(server) { server.middlewares.use(materialApi(process.env.DASHSCOPE_API_KEY || env.DASHSCOPE_API_KEY)); }, configurePreviewServer(server) { server.middlewares.use(materialApi(process.env.DASHSCOPE_API_KEY || env.DASHSCOPE_API_KEY)); } }]
  };
});
