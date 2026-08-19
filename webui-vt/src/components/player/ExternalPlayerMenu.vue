<script setup lang="ts">
import {computed} from 'vue'

/**
 * 交给本机播放器打开。
 *
 * 浏览器只认 mp4/webm 这类容器，而番剧绝大多数是 mkv —— 网页播放器（含 ArtPlayer）
 * 底下都是原生 <video>，谁都变不出 mkv 解复用能力。所以真正的出路是把地址甩给本机播放器。
 *
 * 这些 scheme 与上游 ani-rss 保持一致，用户装了哪个就点哪个；没装的点了不会有反应。
 * 地址里带着 ?s=<令牌>，本机播放器凭它取流。
 */
const props = defineProps<{src: string; name?: string}>()

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
      <v-btn v-bind="menuProps" prepend-icon="mdi-open-in-app" size="small" variant="tonal">
        用本机播放器打开
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-subheader>浏览器放不了 mkv 时用这个</v-list-subheader>
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
