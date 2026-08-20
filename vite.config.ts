import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import type { VitePWAOptions } from 'vite-plugin-pwa';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

const pwaOptions: (mode: 'development' | 'production') => Partial<VitePWAOptions> = (mode) => ({
    mode,
    base: '/',
    includeAssets: ['favicon.ico'],
    manifest: {
        short_name: 'iMbrace',
        name: 'iMBrace NextGen CRM',
        icons: [
            {
                src: 'favicon.ico',
                sizes: '64x64 32x32 24x24 16x16',
                type: 'image/x-icon',
            },
            {
                src: 'logo192.png',
                type: 'image/png',
                sizes: '192x192',
            },
            {
                src: 'logo512.png',
                type: 'image/png',
                sizes: '512x512',
            },
        ],
        start_url: '/',
        display: 'standalone',
        theme_color: '#000000',
        background_color: '#ffffff',
    },
    registerType: 'autoUpdate',
    workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css}'],
        navigateFallback: null,
        disableDevLogs: true,
        maximumFileSizeToCacheInBytes: 6000000,
    },
    devOptions: {
        enabled: mode === 'development',
        /* when using generateSW the PWA plugin will switch to classic */
        type: 'module',
        navigateFallback: 'index.html',
    },
    ...(process.env.SW === 'true' && {
        srcDir: 'src',
        filename: 'service-worker.js',
        strategies: 'injectManifest',
        injectManifest: {
            maximumFileSizeToCacheInBytes: 6000000,
        },
    }),
});

const config = ({ mode }: { mode: 'development' | 'production' }) => {
    process.env = Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

    return defineConfig({
        base: '/',
        plugins: [
            react({
                jsxImportSource: '@emotion/react',
            }),
            viteTsconfigPaths(),
            svgr({
                svgrOptions: {
                    svgoConfig: {
                        plugins: [
                            {
                                removeViewBox: false,
                            },
                        ],
                    },
                },
            }),
            VitePWA(pwaOptions(mode)),
        ],
        define: {
            'process.env': {},
            'process.env.VITE_APP_ON_PREMISE': JSON.stringify(process.env.VITE_APP_ON_PREMISE),
            'process.env.VITE_APP_LOCAL_TRANSLATIONS': JSON.stringify(process.env.VITE_APP_LOCAL_TRANSLATIONS),
            'process.env.VITE_UNABLE_SENTRY': JSON.stringify(process.env.VITE_UNABLE_SENTRY),
        },
        server: {
            port: 3001,
            proxy: {
                '/api/ai-tracing': {
                    target: process.env.VITE_APP_BEST_ACTION,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => ai-tracing service not available?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api\/ai-tracing/, ''),
                },
                '/api/analytics': {
                    target: process.env.VITE_APP_API_DATA_ANALYTICS_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api\/analytics/, ''),
                },
                '/api/ips': {
                    target: process.env.VITE_APP_API_IPS_HOST,
                    changeOrigin: true,
                    cookieDomainRewrite: {
                        'imbrace.co': '',
                    },
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api\/ips/, ''),
                },
                // '/api/marketplaces' intentionally has NO dedicated rule —
                // it falls through to the generic '/api' proxy below, which
                // targets VITE_APP_API_HOST (the gateway) and strips the /api
                // prefix. The gateway routes /marketplaces/v1 → marketplace service.
                '/api/imbrace-ai': {
                    target: process.env.VITE_APP_AI_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api\/imbrace-ai/, ''),
                },
                '/api/imbrace': {
                    target: process.env.VITE_APP_WCS_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                },
                '/api/ai-assistant': {
                    target: process.env.VITE_APP_WCS_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq, req, res) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                },
                '/ap-workflow': {
                    target: process.env.VITE_APP_APWF_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/ap-workflow/, ''),
                },
                '/api/predict': {
                    target: process.env.VITE_APP_FRAUD_DETECTION_HOST || 'http://localhost:8500',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/predict/, '/predict'),
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq, req, res) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                },
                '/api': {
                    target: process.env.VITE_APP_API_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api/, ''),
                    cookieDomainRewrite: {
                        'imbrace.co': '',
                    },
                },
                '/download-proxy': {
                    target: '',
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq, req, res) => {
                            const url = decodeURIComponent(req?.url?.slice(1, req?.url.length) || '');
                            proxyReq.path = url;
                            console.log('Proxy to  => ', url);
                        });
                        proxy.on('proxyRes', (proxyRes, req, res) => {
                            proxyRes.headers['Content-Disposition'] = 'attachment';
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/download-proxy/, ''),
                    headers: {
                        'Content-Disposition': 'attachment',
                        'Content-Security-Policy': "font-src 'self' https://fonts.gstatic.com data:;",
                    },
                },
                '/ws': {
                    target: process.env.VITE_APP_API_HOST_OLD,
                    changeOrigin: true,
                    ws: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('WebSocket Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function (error) {
                            console.log('WebSocket Proxy Error => ', error);
                        });
                    },
                },
                '/marketplace/iframe': {
                    target: process.env.VITE_APP_WCS_HOST,
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to  => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => forget to connect to our vpn?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/marketplace\/iframe/, ''),
                },
               
                '/_next': {
                    target: process.env.VITE_APP_WCS_HOST,
                    changeOrigin: true,
                },
                '/api/fraud-detection': {
                    target: process.env.VITE_APP_FRAUD_DETECTION_HOST || 'http://localhost:8500',
                    changeOrigin: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', function (proxyReq) {
                            console.log('Proxy to fraud detection => ', `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
                        });
                        proxy.on('error', function () {
                            console.log('Error => fraud detection service not available?');
                        });
                    },
                    rewrite: (reqPath) => reqPath.replace(/^\/api\/fraud-detection/, ''),
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        build: {
            outDir: 'build',
            target: browserslistToEsbuild(
                mode === 'development'
                    ? ['last 1 chrome version', 'last 15 firefox version', 'last 5 safari version']
                    : ['>0.2%', 'not dead', 'not op_mini all'],
            ),
            rollupOptions: {
                onwarn: (warning, defaultHandler) => {
                    if (warning.code === 'SOURCEMAP_ERROR') {
                        return;
                    }

                    defaultHandler(warning);
                },
            },
        },
        css: {
            modules: {
                generateScopedName: 'imbrace_[local]_[hash:base64:5]',
                hashPrefix: 'imbrace',
            },
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
                },
            },
        },
        esbuild: {
            include: /\.(js?|tsx?|jsx?)$/,
            exclude: [],
            loader: 'tsx',
        },
    });
};

export default config;
