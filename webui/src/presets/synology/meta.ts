import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'synology',
    name: '群晖 DSM',
    tagline: 'DSM 7 的桌面：顶上一条深色任务栏和主菜单，应用装在一扇带左侧栏的窗里，订阅页是套件中心那种卡片',
    theme: 'synology',
    /* 带总览。DSM 的「系统信息 / 资源监控」就是一屏小挂件，
       四个统计 + 健康状态 + 下载进度正好是它的形状 */
    dashboard: true,
    /* 套件中心是卡片网格，不是表格 —— 一格一条，封面当套件图标 */
    defaultView: 'grid',
}

export default meta
