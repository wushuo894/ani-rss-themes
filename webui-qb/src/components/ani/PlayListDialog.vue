<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, PlayItem} from '@shared/types'
import * as api from '@shared/api'
import {toApiFile} from '@shared/http'
import {formatTime} from '@shared/format'

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

/** 视频与字幕都是服务器上的本地文件，统一走 api/file（令牌在查询串里） */
const srcOf = (p: PlayItem) => (p.filename ? toApiFile(p.filename) : '')
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="720" scrollable @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">{{ item.title }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text class="pa-0">
        <!-- 用浏览器原生播放器：mkv 里的内封字幕多半解不了，但 mp4 能直接看，
             不为此塞一个几百 KB 的播放器库进来 -->
        <div v-if="playing" class="pa-3">
          <video :src="srcOf(playing)" class="w-100 rounded" controls autoplay
                 style="max-height: 46vh; background: #000">
            <track v-for="(s, i) in playing.subtitles || []" :key="i"
                   :label="s.name || `字幕 ${i + 1}`" :src="s.url ? toApiFile(s.url) : ''" kind="subtitles"/>
          </video>
          <div class="text-caption text-medium-emphasis mt-1">{{ playing.name }}</div>
        </div>

        <v-empty-state v-if="!loading && !items.length" icon="mdi-video-off" title="没有找到视频文件"
                       text="该订阅目录下暂无可播放的文件"/>

        <v-list v-else density="comfortable">
          <v-list-item
              v-for="(p, i) in items" :key="i"
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
              <v-btn :href="srcOf(p)" icon="mdi-download" size="small" target="_blank" variant="text"
                     @click.stop/>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
