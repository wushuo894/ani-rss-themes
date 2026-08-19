import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import {mdiWoff2Only} from './shared/vite-mdi-woff2'
import {PRESET_IDS} from './src/presets/ids'

/**
 * 一套源码，构建出五款界面。
 *
 *   VITE_PRESET=vue npm run build     → dist/vue/
 *
 * 五款的差别不只是配色：外壳（导航形态）、订阅页的呈现方式、控件密度各不相同，
 * 由 src/presets/<id>/ 提供，通过 @preset 别名接进来。共用的状态层、接口层、
 * 弹窗、设置页只有一份 —— 复制五遍源码那种「五款」，改一个 bug 要改五次。
 */
const preset = process.env.VITE_PRESET || 'vue'
if (!PRESET_IDS.includes(preset)) {
    throw new Error(`未知预设 ${preset}，可选：${PRESET_IDS.join(' / ')}`)
}

/** 演示模式：拦掉所有请求用内置假数据顶上，给 GitHub Pages 预览用 */
const demo = process.env.VITE_DEMO === '1'

export default defineConfig({
    /**
     * 必须是相对路径。产物是丢进 {configDir}/webui/ 由后端当静态目录托管的，
     * 反代挂子路径时绝对路径的 /assets/... 会直接 404。
     */
    base: './',

    define: {
        __PRESET__: JSON.stringify(preset),
        __DEMO__: JSON.stringify(demo),
    },

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
            '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
            '@preset': fileURLToPath(new URL(`./src/presets/${preset}`, import.meta.url)),
        },
    },

    server: {
        /*
         * 本地开发把 /api 打到跑着的 ani-rss 上。地址走环境变量，不写进仓库：
         *   VITE_API_TARGET=http://<host>:<port> npm run dev
         * 或写在不进版本控制的 .env.local 里。
         */
        proxy: process.env.VITE_API_TARGET
            ? {'/api': {target: process.env.VITE_API_TARGET, changeOrigin: true}}
            : undefined,
    },

    build: {
        outDir: `dist/${preset}`,
        emptyOutDir: true,
        // 后端只按文件名找文件，没有 SPA fallback，产物必须是老实的 index.html + assets/
        assetsDir: 'assets',
        chunkSizeWarningLimit: 1200,
    },
})
