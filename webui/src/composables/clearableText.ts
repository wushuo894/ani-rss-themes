import {computed, ref, type WritableComputedRef} from 'vue'

/**
 * 一个「永远是字符串」的文本 ref，专门配 Vuetify 的 `clearable`。
 *
 * 这是一个踩过三次的坑：`<v-text-field clearable>` 右边那颗小叉子清空时，
 * 写回来的是 **null**，不是空串（Vuetify 一直如此，v-select / v-combobox 也一样）。
 * 而拿到这个值的地方几乎都要 `.trim()` 一下 —— 于是：
 *
 *     const k = keyword.value.trim()      // TypeError: keyword.value is null
 *
 * 抛在 computed 里没人接得住，筛选结果就卡在上一次的样子。
 * 用户看到的是「点清空没反应，得在框里一路退格才还原」—— 退格给的是 ''，不抛。
 *
 * 中招的三处：订阅搜索（十一款顶栏共用）、日志过滤、番剧浏览器里的搜索。
 * 与其在每个 v-model 上各转一道（漏一个就复发），不如让**值本身**兜住。
 *
 * 不写成 `ref<string | null>` 再到处判空：那是把这个坑摊给每一个读它的人。
 */
export function clearableText(initial = ''): WritableComputedRef<string> {
    const inner = ref(initial)
    return computed({
        get: () => inner.value,
        set: v => (inner.value = v ?? ''),
    })
}
