import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'win98',
    name: 'Windows 98',
    tagline: '整个应用是一扇窗：标题栏、菜单栏、资源管理器窗格、状态栏，底下钉一条任务栏',
    theme: 'win98',
    /* 带总览。Win98 的「系统属性」就是一页分组框，
       四个统计 + 今天更新 + 下载中 + 疑似停更，正好是它的形状 */
    dashboard: true,
    /* 订阅页默认就是「详细信息」—— 一行一条、列对齐、点表头排序，
       这一款最像资源管理器的地方全在这个视图里。海报墙在工具栏上一键切过去 */
    defaultView: 'list',
}

export default meta
