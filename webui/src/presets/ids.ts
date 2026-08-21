/**
 * 六款界面的 id。构建时 vite.config.ts 会读它做校验，所以这里不能 import 任何
 * 带 .vue 或浏览器 API 的东西 —— 它要在 Node 里被直接执行。
 *
 * 这份清单是唯一的一份：构建、CI 校验、打包、体检脚本全从这里读，
 * 加一款只改这一行。以前那几处各抄了一遍同样的 id，加第六款要记得改四个地方。
 */
export const PRESET_IDS = ['acg', 'liquid-glass', 'vue', 'github', 'material', 'win98'] as const

export type PresetId = typeof PRESET_IDS[number]
