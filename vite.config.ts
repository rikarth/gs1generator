import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({command}) => {
  return {
    base: command === 'build' ? './' : '/',
    build: {
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
    },
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      // Inlines built JS and CSS into dist/index.html so opening it via file://
      // avoids browser CORS blocks on external module/stylesheet loads.
      {
        name: 'inline-bundle-for-file-protocol',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
          const htmlEntry = Object.values(bundle).find(
            (item) => item.type === 'asset' && item.fileName === 'index.html',
          );
          if (!htmlEntry || htmlEntry.type !== 'asset') return;

          let html =
            typeof htmlEntry.source === 'string'
              ? htmlEntry.source
              : Buffer.from(htmlEntry.source).toString('utf-8');

          for (const [fileName, item] of Object.entries(bundle)) {
            if (item.type === 'asset' && fileName.endsWith('.css')) {
              const cssText =
                typeof item.source === 'string'
                  ? item.source
                  : Buffer.from(item.source).toString('utf-8');
              const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const linkRegex = new RegExp(
                `<link\\b[^>]*href=["'](?:\\.?\\/)?${escapedName}["'][^>]*>`,
                'gi',
              );
              if (linkRegex.test(html)) {
                html = html.replace(linkRegex, () => `<style>${cssText}</style>`);
                delete bundle[fileName];
              }
            } else if (item.type === 'chunk' && fileName.endsWith('.js') && item.isEntry) {
              const safeCode = item.code.replace(/<\/(script)/gi, '<\\/$1');
              const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const scriptRegex = new RegExp(
                `<script\\b[^>]*src=["'](?:\\.?\\/)?${escapedName}["'][^>]*><\\/script>`,
                'gi',
              );
              if (scriptRegex.test(html)) {
                html = html.replace(
                  scriptRegex,
                  () => `<script type="module">${safeCode}</script>`,
                );
                delete bundle[fileName];
              }
            }
          }

          htmlEntry.source = html;
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
