/**
 * 五款界面的 id。构建时 vite.config.ts 会读它做校验，所以这里不能 import 任何
 * 带 .vue 或浏览器 API 的东西 —— 它要在 Node 里被直接执行。
 */
export const PRESET_IDS = ['acg', 'liquid-glass', 'vue', 'github', 'material'] as const

export type PresetId = typeof PRESET_IDS[number]
