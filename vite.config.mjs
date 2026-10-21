import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const domain = env.DEV_DOMAIN;

  return {
    base: command === 'build' || isPreview ? '/rxjs-operatory/' : '/',

    server: {
      host: '127.0.0.1',
      port: Number(env.DEV_PORT || 4001),
      strictPort: true,

      ...(domain && {
        allowedHosts: [domain],
        hmr: {
          protocol: 'wss',
          host: domain,
          clientPort: 443,
        },
      }),
    },
  };
})
