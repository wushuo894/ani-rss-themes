<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useRouter} from 'vue-router'
import type {Ani, PlayItem} from '@shared/types'
import * as api from '@shared/api'
import {toApiFile} from '@shared/http'
import {formatTime} from '@shared/format'
import ExternalPlayerMenu from '@/components/player/ExternalPlayerMenu.vue'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const {mobile} = useDisplay()
const router = useRouter()
const dialog = ref(true)
const loading = ref(false)
const items = ref<PlayItem[]>([])

onMounted(async () => {
  loading.value = true
  try {
    items.value = await api.playList(props.item)
  } finally {
    loading.value = false
  }
})

const srcOf = (p: PlayItem) => (p.filename ? toApiFile(p.filename) : '')

/**
 * 交给播放页。
 * 不在弹窗里塞播放器：webplayer 自带完整的播放界面（轨道选择、字幕、弹幕、Anime4K），
 * 挤在一个对话框里两边都难受，整页给它更合适。
 */
function play(p: PlayItem) {
  const sub = (p.subtitles || []).find(s => s.url)
  void router.push({
    name: 'play',
    query: {
      src: srcOf(p),
      title: `${props.item.title || ''}${p.episode ? ` E${String(p.episode).padStart(2, '0')}` : ''}`.trim(),
      ...(sub?.url ? {suburl: toApiFile(sub.url), sublabel: sub.name || '字幕'} : {}),
    },
  })
}
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
        <v-empty-state v-if="!loading && !items.length" icon="mdi-video-off"
                       text="该订阅目录下暂无可播放的文件" title="没有找到视频文件"/>

        <v-list v-else density="comfortable">
          <v-list-item
              v-for="(p, i) in items"
              :key="i"
              :subtitle="`${p.formatSize || ''} · ${formatTime(p.lastModify)}`"
              :title="p.title || p.name"
              @click="play(p)"
          >
            <template #prepend>
              <v-avatar color="surface-variant" size="36">
                <span class="text-caption">{{ p.episode ?? '—' }}</span>
              </v-avatar>
            </template>

            <template #append>
              <div class="d-flex align-center ga-1" @click.stop>
                <ExternalPlayerMenu :name="p.name" :src="srcOf(p)" icon-only/>
                <v-btn :href="srcOf(p)" icon="mdi-download" size="small" target="_blank" title="下载"
                       variant="text"/>
                <v-btn color="primary" icon="mdi-play" size="small" title="播放" variant="text"
                       @click="play(p)"/>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
