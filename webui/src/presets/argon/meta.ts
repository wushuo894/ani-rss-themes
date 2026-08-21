import type {PresetMeta} from '../types'

const meta: PresetMeta = {
    id: 'argon',
    name: 'Argon',
    tagline: '博客的排法：毛玻璃顶栏 + 居中正文栏 + 右侧小挂件，每条订阅是一张会浮起来的大圆角卡',
    theme: 'argon',
    /* 带总览。博客首页本来就是「一段问候 + 几个数字 + 最新几篇」，
       总览页的内容正好是这个形状 */
    dashboard: true,
    /* 单列大卡是这一款的主视图，不是海报墙 —— Argon 的文章列表就是一列宽卡，
       封面缩在左边当缩略图，右边全是字 */
    defaultView: 'list',
}

export default meta
