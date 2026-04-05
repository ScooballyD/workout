import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function normalizeBasePath(base: string): string {
  return base.endsWith('/') ? base : `${base}/`;
}

function toBaseScopedUrl(base: string, value: string): string {
  if (/^[a-z]+:/i.test(value)) {
    return value;
  }

  const normalizedBase = normalizeBasePath(base);
  const normalizedValue = value.replace(/^\/+/, '');

  return normalizedBase === '/' ? `/${normalizedValue}` : `${normalizedBase}${normalizedValue}`;
}

function syncPwaManifestBase(): Plugin {
  let base = '/';

  return {
    name: 'sync-pwa-manifest-base',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = normalizeBasePath(config.base);
    },
    generateBundle(_, bundle) {
      const manifestAsset = bundle['manifest.webmanifest'];
      if (!manifestAsset || manifestAsset.type !== 'asset' || typeof manifestAsset.source !== 'string') {
        return;
      }

      const manifest = JSON.parse(manifestAsset.source) as {
        start_url?: string;
        scope?: string;
        icons?: Array<{src: string}>;
      };

      manifest.start_url = base;
      manifest.scope = base;
      manifest.icons = manifest.icons?.map((icon) => ({
        ...icon,
        src: toBaseScopedUrl(base, icon.src),
      }));

      manifestAsset.source = JSON.stringify(manifest);
    },
  };
}

export default defineConfig(({mode}) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Megalifts',
          short_name: 'Megalifts',
          description: 'Megalifts helps you track workouts, training plans, and PRs directly on your device.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      }),
      syncPwaManifestBase(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
