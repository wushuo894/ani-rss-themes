import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'github',
    name: 'GitHub',
    tagline: 'Primer 的路子：深色顶栏 + 一排 tab，内容是一张带边框的清单',
    theme: 'github',
    /* 原来是 false（打开直接进清单，少一次点击）。
       结果是只有这一款少一整页 —— 「今天有几部要更新」「谁在下」「谁停更了」
       这三件事只有这一款看不到。github.com 首页本身也是 feed + 右边栏，补上不违和 */
    dashboard: true,
}

export default meta
