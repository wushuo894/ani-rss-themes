/// <reference types="vite/client" />

declare module '*.vue' {
    import type {DefineComponent} from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

/** 构建期注入：当前是哪一款界面，以及是不是演示构建 */
declare const __PRESET__: string
declare const __DEMO__: boolean
/** 构建期注入：这套界面自己的版本号（webui/package.json 的 version） */
declare const __VERSION__: string
