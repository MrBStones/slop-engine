import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtools from 'solid-devtools/vite'

export default defineConfig({
    plugins: [devtools(), solidPlugin()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'esnext',
    },
    optimizeDeps: {
        exclude: ['@babylonjs/havok', 'monaco-editor'],
    },
    assetsInclude: ['**/*.wasm'],
})
