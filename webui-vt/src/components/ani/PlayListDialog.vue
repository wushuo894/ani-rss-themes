<script setup lang="ts">
import {computed, defineAsyncComponent, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, PlayItem} from '@shared/types'
import * as api from '@shared/api'
import {toApiFile} from '@shared/http'
import {formatTime} from '@shared/format'
import ExternalPlayerMenu from '@/components/player/ExternalPlayerMenu.vue'

// ArtPlayer 连同插件约 42KB(gzip)，只有真点开某一集才需要，别压在首屏
const VideoPlayer = defineAsyncComponent(() => import('@/components/player/VideoPlayer.vue'))

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const {mobile} = useDisplay()
const dialog = ref(true)
const loading = ref(false)
const items = ref<PlayItem[]>([])
const playing = ref<PlayItem | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await api.playList(props.item)
  } finally {
    loading.value = false
  }
})

const playingSrc = computed(() => (playing.value?.filename ? toApiFile(playing.value.filename) : ''))

/** 浏览器普遍只认 mp4/webm 这两个容器；其余的（主要是 mkv）提示走本机播放器 */
const maybeUnsupported = computed(() => {
  const ext = (playing.value?.extName || '').toLowerCase()
  return !!ext && !['mp4', 'm4v', 'webm', 'ogg'].includes(ext)
})
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="880" scrollable @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">{{ item.title }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text class="pa-0">
        <div v-if="playing" class="pa-3">
          <VideoPlayer :item="playing"/>

          <div class="d-flex align-center flex-wrap ga-2 mt-2">
            <div class="text-caption text-medium-emphasis flex-grow-1 text-truncate">{{ playing.name }}</div>
            <ExternalPlayerMenu :name="playing.name" :src="playingSrc"/>
            <v-btn :href="playingSrc" prepend-icon="mdi-download" size="small" target="_blank" variant="text">
              下载
            </v-btn>
          </div>

          <v-alert v-if="maybeUnsupported" class="mt-2" density="compact" type="info" variant="tonal">
            .{{ playing.extName }} 是浏览器普遍不支持的容器，网页里多半只有声音或直接放不出来。
            用上面的「本机播放器」打开即可。
          </v-alert>
        </div>

        <v-empty-state v-if="!loading && !items.length" icon="mdi-video-off"
                       text="该订阅目录下暂无可播放的文件" title="没有找到视频文件"/>

        <v-list v-else density="comfortable">
          <v-list-item
              v-for="(p, i) in items"
              :key="i"
              :active="playing?.filename === p.filename"
              :subtitle="`${p.formatSize || ''} · ${formatTime(p.lastModify)}`"
              :title="p.title || p.name"
              @click="playing = p"
          >
            <template #prepend>
              <v-avatar color="surface-variant" size="36">
                <span class="text-caption">{{ p.episode ?? '—' }}</span>
              </v-avatar>
            </template>
            <template #append>
              <v-btn :href="p.filename ? toApiFile(p.filename) : ''" icon="mdi-download" size="small"
                     target="_blank" variant="text" @click.stop/>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
