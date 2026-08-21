import type {Ani} from '@shared/types'
import type {AniScreen} from '@/composables/useAniScreen'
import {usePrefsStore} from '@/stores/prefs'

/**
 * 一条订阅能做的事，全站唯一一份。
 *
 * 之前这份清单是五款界面各抄各的，抄着抄着就散了：
 * Material 的列表行只有「预览 / 编辑 / 删除」三项，GitHub 那款有七项还多一个
 * 「刷新这一条」，玻璃那款六项 —— 同一条订阅，换个皮肤就少几个能力，
 * 而少掉的那几个不点开菜单根本发现不了。
 *
 * 现在加一个动作只改这里，六款一起有。每款仍然自己决定「怎么摆」：
 * 图标一排、下拉菜单、还是列表项，读 compact 分主次即可。
 */
export interface AniAction {
    key: string
    title: string
    icon: string
    /** true 表示适合放进狭窄的图标行；其余的收进「更多」菜单 */
    compact?: boolean
    /** 危险动作，界面上给红色 */
    danger?: boolean
    run: () => void
}

/**
 * @param s   订阅页的状态
 * @param a   这一条订阅
 */
export function aniActions(s: AniScreen, a: Ani): AniAction[] {
    const prefs = usePrefsStore()
    const list: AniAction[] = []

    if (prefs.showPlaylist) {
        list.push({key: 'playlist', title: '视频列表', icon: 'mdi-play-circle-outline', compact: true,
            run: () => s.on.playlist(a)})
    }
    list.push(
        {key: 'edit', title: '编辑', icon: 'mdi-pencil-outline', compact: true, run: () => s.on.edit(a)},
        {key: 'preview', title: '预览匹配结果', icon: 'mdi-eye-outline', compact: true, run: () => s.on.preview(a)},
        /* 刷新单条：原来只有 GitHub 那款有。RSS 刚更新时不想等下一轮轮询，
           这是最常按的一个，没道理只在一款界面里存在 */
        {key: 'refresh', title: '刷新这一条', icon: 'mdi-refresh', run: () => void s.ani.refreshOne(a)},
        /* 单条启停：原来只能进多选模式再批量操作，为了停一条番要点四下 */
        {
            key: 'enable',
            title: a.enable ? '停用' : '启用',
            icon: a.enable ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline',
            run: () => void s.ani.setEnabled([a.id ?? ''], !a.enable),
        },
        {key: 'cover', title: '更换封面', icon: 'mdi-image-edit-outline', run: () => s.on.cover(a)},
        {key: 'rate', title: '评分', icon: 'mdi-star-outline', run: () => s.on.rate(a)},
        {key: 'del', title: '删除', icon: 'mdi-delete-outline', danger: true, run: () => s.on.del(a)},
    )
    return list
}

/**
 * 图标行用的那几个。
 *
 * max 是给窄屏留的口子：卡片只有 150 来点宽，图标按钮在手机上要给到 40px 才点得着，
 * 四颗（三个常用 + 「更多」）就是 172px，装不下 —— 最后那颗会被顶出卡片外。
 * 超出 max 的不是丢掉，是退回「更多」菜单里（见 overflowOf），一个动作都不会消失。
 */
export const compactOf = (list: AniAction[], max = Infinity) =>
    list.filter(x => x.compact).slice(0, max)

/** 「更多」菜单用的那几个：本来就不常用的，加上被 max 挤下来的 */
export const overflowOf = (list: AniAction[], max = Infinity) => {
    const kept = new Set(compactOf(list, max).map(x => x.key))
    return list.filter(x => !x.compact || !kept.has(x.key))
}
