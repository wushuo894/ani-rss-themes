import type {PresetId} from './ids'

/** 一款界面的自我介绍。构建期只会打包中选的那一款。 */
export interface PresetMeta {
    id: PresetId
    /** 界面名，显示在侧栏和关于页 */
    name: string
    /** 一句话说清它是什么路子 */
    tagline: string
    /** 默认皮肤（用户仍可在设置里换成另外四款） */
    theme: string
    /** 是否带总览页。不带的界面进来直接是订阅列表 */
    dashboard: boolean
}
