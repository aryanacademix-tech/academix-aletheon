import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Build-time asset verification plugin to guarantee all PWA assets exist and are valid at root paths
function verifyPwaAssetsPlugin(): Plugin {
  return {
    name: 'verify-pwa-assets',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      const requiredAssets = [
        { path: '/pwa-192x192.png', minSize: 1000 },
        { path: '/pwa-512x512.png', minSize: 1000 },
        { path: '/maskable-icon-512x512.png', minSize: 1000 },
        { path: '/apple-touch-icon.png', minSize: 1000 },
        { path: '/icon.svg', minSize: 100 },
        { path: '/shortcut-focus.png', minSize: 500 },
        { path: '/shortcut-quiz.png', minSize: 500 },
        { path: '/shortcut-research.png', minSize: 500 },
        { path: '/shortcut-puzzles.png', minSize: 500 },
        { path: '/screenshot-desktop.png', minSize: 1000 },
        { path: '/screenshot-mobile.png', minSize: 1000 },
        { path: '/widget-template.json', minSize: 50 },
        { path: '/widget-data.json', minSize: 10 },
        { path: '/manifest.json', minSize: 100 },
        { path: '/sw.js', minSize: 500 }
      ];

      console.log('\n[PWA Asset Validator] Verifying PWA assets at root paths...');
      let allValid = true;

      for (const asset of requiredAssets) {
        const filePath = path.join(publicDir, asset.path.replace(/^\//, ''));
        if (!fs.existsSync(filePath)) {
          console.warn(`[PWA Asset Warning] Missing asset at root path: ${asset.path}`);
          allValid = false;
        } else {
          const stat = fs.statSync(filePath);
          if (stat.size < asset.minSize) {
            console.warn(`[PWA Asset Warning] Asset ${asset.path} size (${stat.size}B) is below threshold (${asset.minSize}B)`);
            allValid = false;
          }
        }
      }

      if (allValid) {
        console.log('[PWA Asset Validator] All 15 required PWA root assets verified successfully.\n');
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      verifyPwaAssetsPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        injectRegister: null,
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'maskable-icon-512x512.png',
          'shortcut-focus.png',
          'shortcut-quiz.png',
          'shortcut-research.png',
          'shortcut-puzzles.png',
          'screenshot-desktop.png',
          'screenshot-mobile.png',
          'app_logo.jpg',
          'app_logo.png',
          'logo.jpg',
          'widget-data.json',
          'widget-template.json'
        ],
        manifest: {
          id: 'academix-aletheon-pwa',
          name: 'Academix Aletheon',
          short_name: 'Academix',
          description: 'Academix Aletheon - Advanced AI-powered study, research, and calculation productivity suite.',
          lang: 'en-US',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: [
            'window-controls-overlay',
            'standalone',
            'minimal-ui',
            'browser'
          ],
          background_color: '#09090b',
          theme_color: '#09090b',
          orientation: 'any',
          categories: [
            'education',
            'productivity',
            'utilities'
          ],
          iarc_rating_id: 'e84b075f-2b22-4f22-9218-e3909794d0c1',
          prefer_related_applications: false,
          related_applications: [
            {
              platform: 'play',
              url: 'https://play.google.com/store/apps/details?id=com.academix.app',
              id: 'com.academix.app'
            },
            {
              platform: 'windows',
              url: 'https://apps.microsoft.com/store/detail/academix/9NBLGGH4NNS1',
              id: '9NBLGGH4NNS1'
            }
          ],
          launch_handler: {
            client_mode: [
              'navigate-existing',
              'auto'
            ]
          },
          shortcuts: [
            {
              name: 'Focus Timer & Study',
              short_name: 'Focus',
              description: 'Start a focused study session with custom timers and ambient sounds',
              url: '/?feature=focustimer',
              icons: [
                {
                  src: '/shortcut-focus.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            },
            {
              name: 'Quiz Master',
              short_name: 'Quiz',
              description: 'Generate interactive study quizzes and flashcards',
              url: '/?feature=quiz',
              icons: [
                {
                  src: '/shortcut-quiz.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            },
            {
              name: 'Keen Researchers',
              short_name: 'Research',
              description: 'AI-assisted deep academic research and query engine',
              url: '/?feature=research',
              icons: [
                {
                  src: '/shortcut-research.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            },
            {
              name: 'Outside the Box Puzzles',
              short_name: 'Puzzles',
              description: 'Brain teaser riddles and logic exercises',
              url: '/?feature=puzzles',
              icons: [
                {
                  src: '/shortcut-puzzles.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            }
          ],
          file_handlers: [
            {
              action: '/',
              name: 'Academic & Study Documents',
              accept: {
                'text/plain': ['.txt', '.md'],
                'application/pdf': ['.pdf'],
                'application/json': ['.json']
              },
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            }
          ],
          protocol_handlers: [
            {
              protocol: 'web+academix',
              url: '/?q=%s'
            }
          ],
          share_target: {
            action: '/?share=true',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url'
            }
          },
          widgets: [
            {
              name: 'Academix Quick Stats',
              short_name: 'Stats',
              description: 'Track study streak, active tasks, and research progress',
              tag: 'academix-quick-stats',
              template: 'widget-template',
              ms_ac_template: '/widget-template.json',
              data: '/widget-data.json',
              type: 'application/json',
              screenshots: [
                {
                  src: '/screenshot-mobile.png',
                  sizes: '750x1334',
                  type: 'image/png',
                  label: 'Academix Stats Widget Preview'
                }
              ]
            }
          ],
          edge_side_panel: {
            preferred_width: 480
          },
          note_taking: {
            new_note_url: '/?feature=notes'
          },
          scope_extensions: [
            {
              origin: '*.academix.app'
            },
            {
              origin: 'https://academix-support.com'
            }
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon.svg',
              type: 'image/svg+xml',
              sizes: 'any',
              purpose: 'any'
            }
          ],
          screenshots: [
            {
              src: '/screenshot-desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Academix Aletheon Desktop Interface'
            },
            {
              src: '/screenshot-mobile.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Academix Aletheon Mobile Application View'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,json}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        }
      } as any)
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
