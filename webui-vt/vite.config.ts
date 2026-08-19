import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import {mdiWoff2Only} from '../webui-shared/vite-mdi-woff2'

export default defineConfig({
    /**
     * 必须是相对路径。产物是丢进 {configDir}/webui/ 由后端当静态目录托管的，
     * 反代挂子路径时绝对路径的 /assets/... 会直接 404。
     */
    base: './',

    plugins: [
        vue(),
        // 图标字体只留 woff2，砍掉 3.2MB 永远不会被加载的 eot/ttf/woff
        mdiWoff2Only(),
        // 按需引入 Vuetify 组件与样式，顺带让 SASS 变量覆盖生效
        vuetify({autoImport: true, styles: {configFile: 'src/styles/settings.scss'}}),
    ],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@shared': fileURLToPath(new URL('../webui-shared', import.meta.url)),
        },
    },

    server: {
        // 本地开发时把 /api 打到跑着的 ani-rss 实例上（端口见 config.local.json，不进版本控制）
        proxy: {'/api': {target: 'http://127.0.0.1:7789', changeOrigin: true}},
        // webui-shared 在工程目录之外，dev server 默认不许读，得显式放行
        fs: {allow: ['..']},
    },

    build: {
        outDir: 'dist',
        // 后端只按文件名找文件，没有 SPA fallback，产物必须是老实的 index.html + assets/
        assetsDir: 'assets',
        chunkSizeWarningLimit: 1200,
    },
})
