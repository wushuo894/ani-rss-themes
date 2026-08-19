<script setup lang="ts">
import {computed} from 'vue'

/**
 * 交给本机播放器打开。
 *
 * 网页播放走 webplayer（本地拆容器 → fMP4 → MSE），mkv 与 ASS 特效字幕都能放，
 * 所以这里不再是唯一出路，而是三种情况下的备选：
 *   1. 没部署 webplayer（webui/player/ 不存在）
 *   2. 想用本机播放器的硬件解码 —— 大码率 4K 在浏览器里解会吃力
 *   3. 手机上想丢给已经装好的播放器接着看
 *
 * 这些 scheme 与上游 ani-rss 保持一致，装了哪个就点哪个；没装的点了不会有反应。
 * 地址里带着 ?s=<令牌>，本机播放器凭它取流。
 */
const props = defineProps<{src: string; name?: string; iconOnly?: boolean}>()

const enc = (s: string) => encodeURIComponent(s)

const players = computed(() => {
  const url = props.src
  const name = props.name || ''
  return [
    {label: 'PotPlayer', icon: 'mdi-play-circle-outline', url: `potplayer://${url}`},
    {label: 'VLC', icon: 'mdi-cone', url: `vlc://${url}`},
    {label: 'IINA', icon: 'mdi-apple', url: `iina://weblink?url=${enc(url)}&mpv_force-media-title=${enc(name)}`},
    {label: 'MPV', icon: 'mdi-movie-open-outline', url: `mpvplay://${url}&mpv_force-media-title=${enc(name)}`},
    {label: 'Infuse', icon: 'mdi-television-classic', url: `infuse://x-callback-url/play?url=${url}&filename=${enc(name)}`},
    {label: '弹弹 Play', icon: 'mdi-comment-multiple-outline', url: `ddplay:${enc(url)}|filePath=${enc(name)}`},
    {label: 'AnimacX', icon: 'mdi-animation-play-outline', url: `anix://openVideo/${enc(url)}`},
    {label: 'SenPlayer', icon: 'mdi-play-box-outline', url: `SenPlayer://x-callback-url/play?url=${url}&name=${enc(name)}`},
  ]
})

function open(url: string) {
  window.open(url, '_self')
}
</script>

<template>
  <v-menu>
    <template #activator="{props: menuProps}">
      <v-btn
          v-bind="menuProps"
          :icon="iconOnly ? 'mdi-open-in-app' : undefined"
          :prepend-icon="iconOnly ? undefined : 'mdi-open-in-app'"
          :variant="iconOnly ? 'text' : 'tonal'"
          size="small"
          title="用本机播放器打开"
      >
        <template v-if="!iconOnly">用本机播放器打开</template>
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-subheader>用装在本机的播放器接着看</v-list-subheader>
      <v-list-item
          v-for="p in players"
          :key="p.label"
          :prepend-icon="p.icon"
          :title="p.label"
          @click="open(p.url)"
      />
    </v-list>
  </v-menu>
</template>
