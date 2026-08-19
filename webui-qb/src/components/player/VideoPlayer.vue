<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue'
import Artplayer from 'artplayer'
import artplayerPluginMultipleSubtitles from 'artplayer-plugin-multiple-subtitles'
import type {PlayItem} from '@shared/types'
import {toApiFile} from '@shared/http'
import * as api from '@shared/api'

const props = defineProps<{item: PlayItem}>()

const box = ref<HTMLDivElement | null>(null)
/** ArtPlayer 实例不需要响应式，用 shallowRef 免得 Vue 深挂它内部一大坨对象 */
const art = shallowRef<Artplayer | null>(null)
/** 为内封字幕创建的 blob 地址，卸载时逐个 revoke */
let blobUrls: string[] = []

/** 插件要的字幕形状。后端的 PlayItemSubtitles 字段更宽松，这里收窄成插件认的样子 */
interface Track {
    url: string
    name: string
    html: string
    type?: 'vtt' | 'srt' | 'ass'
}

/** 后端 type 是自由字符串，只放行插件认识的三种，其余交给它按扩展名猜 */
function narrowType(t?: string): Track['type'] {
    return t === 'vtt' || t === 'srt' || t === 'ass' ? t : undefined
}

/**
 * 收集字幕。两个来源：
 *  1. item.subtitles —— 视频旁边的外挂字幕文件，后端给服务器路径，走 api/file 取
 *  2. getSubtitles   —— mkv 内封字幕，后端把内容转成 VTT 文本回来，包成 blob 用
 * 后端只对 mkv 做内封提取（非 mkv 直接返回空），所以这里不必自己判断扩展名。
 */
async function collectTracks(): Promise<Track[]> {
    const out: Track[] = []

    for (const [i, s] of (props.item.subtitles || []).entries()) {
        if (!s.url) continue
        const name = s.name || `字幕 ${i + 1}`
        out.push({url: toApiFile(s.url), name, html: s.html || name, type: narrowType(s.type)})
    }

    if (props.item.filename) {
        try {
            const inner = await api.getSubtitles(props.item.filename)
            for (const [i, s] of inner.entries()) {
                if (!s.content) continue
                const url = URL.createObjectURL(new Blob([s.content], {type: 'text/vtt'}))
                blobUrls.push(url)
                const name = s.name || `内封 ${i + 1}`
                out.push({url, name, html: s.html || name, type: 'vtt'})
            }
        } catch {
            // 取不到内封字幕不影响播放
        }
    }

    return out
}

/** 插件实例上的方法没有类型，收窄成我们真正用到的那一个 */
function subtitlePlugin(): {tracks: (names: string[]) => void} | null {
    return (art.value?.plugins as Record<string, unknown> | undefined)
        ?.multipleSubtitles as {tracks: (names: string[]) => void} | undefined ?? null
}

async function create() {
    if (!box.value) return

    const tracks = await collectTracks()
    // 组件可能在 await 期间被卸载
    if (!box.value) return

    const first = tracks[0]?.name

    art.value = new Artplayer({
        container: box.value,
        url: props.item.filename ? toApiFile(props.item.filename) : '',
        // 不传 type：ArtPlayer 只拿它去查 customType，我们没有自定义解复用器，查不到本来也会落回 video.src
        volume: 0.8,
        autoplay: false,
        playbackRate: true,
        pip: true,
        fullscreen: true,
        fullscreenWeb: true,
        setting: true,
        plugins: tracks.length ? [artplayerPluginMultipleSubtitles({subtitles: tracks})] : [],
        settings: tracks.length
            ? [{
                width: 220,
                html: '字幕',
                tooltip: first,
                selector: tracks.map(t => ({...t, default: t.name === first})),
                onSelect(item: unknown) {
                    const t = item as Track
                    subtitlePlugin()?.tracks([t.name])
                    return t.html
                },
            }]
            : [],
    })

    if (first) {
        art.value.on('video:canplay', () => subtitlePlugin()?.tracks([first]))
    }
}

function destroy() {
    try {
        art.value?.destroy(true)
    } catch {
        // 已经销毁过就算了
    }
    art.value = null
    blobUrls.forEach(u => URL.revokeObjectURL(u))
    blobUrls = []
}

onMounted(create)
onBeforeUnmount(destroy)

// 切换剧集时整个重建：换源后字幕轨要跟着换，重建比逐项改稳妥
watch(() => props.item.filename, () => {
    destroy()
    void create()
})
</script>

<template>
  <div ref="box" class="player"/>
</template>

<style scoped>
.player {
    width: 100%;
    /* 番剧基本都是 16:9，先按比例占位，避免加载时高度跳一下 */
    aspect-ratio: 16 / 9;
    max-height: 60vh;
    background: #000;
}
</style>
