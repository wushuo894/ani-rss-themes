<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {BgmInfo, CollectionInfo, Item} from '@shared/types'
import * as api from '@shared/api'
import {useUiStore} from '@/stores/ui'

const model = defineModel<boolean>({required: true})

const ui = useUiStore()
const {mobile} = useDisplay()

const busy = ref('')
const files = ref<File[]>([])
/** 后端要的是 .torrent 的 base64，不是文件本身 */
const data = ref<CollectionInfo>({torrent: '', ani: {}, bgmInfo: {}})
const keyword = ref('')
const results = ref<BgmInfo[]>([])
const preview = ref<Item[]>([])

// v-file-input 单选时给 File、多选时给 File[]，两种都要接
async function onPick(picked: File | File[]) {
  const fs = Array.isArray(picked) ? picked : picked ? [picked] : []
  const f = fs?.[0]
  if (!f) return
  if (!f.name.endsWith('.torrent')) return ui.error('请选择 .torrent 文件')
  busy.value = 'upload'
  try {
    // type=getBase64：后端只回 base64、不落盘，正合合集这种一次性用途
    data.value.torrent = await api.upload(f, 'getBase64')
    ui.success('种子已读取')
    await guessSubgroup()
  } finally {
    busy.value = ''
  }
}

async function guessSubgroup() {
  if (!data.value.torrent) return
  try {
    const sub = await api.getCollectionSubgroup(data.value)
    if (sub) {
      data.value.ani = {...data.value.ani, subgroup: sub}
      ui.info(`识别到字幕组：${sub}`)
    }
  } catch {
    // 认不出来不算错，用户可以自己填
  }
}

async function search() {
  if (!keyword.value.trim()) return
  busy.value = 'search'
  try {
    results.value = await api.searchBgm(keyword.value.trim())
    if (!results.value.length) ui.warn('没有搜到条目')
  } finally {
    busy.value = ''
  }
}

async function pick(b: BgmInfo) {
  busy.value = 'pick'
  try {
    data.value.bgmInfo = b
    data.value.ani = {...(await api.getAniBySubjectId(String(b.id))), subgroup: data.value.ani?.subgroup}
    ui.success(`已选择：${b.nameCn || b.name}`)
  } finally {
    busy.value = ''
  }
}

async function doPreview() {
  if (!data.value.torrent) return ui.error('请先选择种子文件')
  busy.value = 'preview'
  try {
    preview.value = await api.previewCollection(data.value)
    if (!preview.value.length) ui.warn('没有解析出可下载的剧集')
  } finally {
    busy.value = ''
  }
}

async function start() {
  if (!data.value.torrent) return ui.error('请先选择种子文件')
  busy.value = 'start'
  try {
    await api.startCollection(data.value)
    ui.success('已开始下载合集')
    model.value = false
    reset()
  } finally {
    busy.value = ''
  }
}

function reset() {
  files.value = []
  data.value = {torrent: '', ani: {}, bgmInfo: {}}
  keyword.value = ''
  results.value = []
  preview.value = []
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="720" scrollable @after-leave="reset">
    <v-card>
      <v-card-title class="d-flex align-center">
        合集下载
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-3">
          用一个整季打包的种子建立订阅：先选种子，再指定它对应的 Bangumi 条目，
          刮削与重命名才能按正确的剧集信息进行。
        </div>

        <v-file-input
            v-model="files"
            :loading="busy === 'upload'"
            accept=".torrent"
            class="mb-3"
            label="合集种子（.torrent）"
            prepend-icon="mdi-file-download-outline"
            show-size
            @update:model-value="onPick"
        />

        <v-text-field
            v-model="keyword"
            :loading="busy === 'search'"
            append-inner-icon="mdi-magnify"
            class="mb-2"
            label="搜索 Bangumi 条目"
            @click:append-inner="search"
            @keyup.enter="search"
        />

        <v-list v-if="results.length" class="mb-3" density="compact" max-height="200" style="overflow-y:auto">
          <v-list-item v-for="b in results" :key="b.id" :subtitle="b.date" :title="b.nameCn || b.name"
                       @click="pick(b)">
            <template #prepend>
              <v-avatar rounded size="32">
                <v-img :src="b.images?.grid || b.images?.small"/>
              </v-avatar>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-if="data.bgmInfo?.id" class="mb-3" density="compact" type="success" variant="tonal">
          已选条目：{{ data.bgmInfo.nameCn || data.bgmInfo.name }}
        </v-alert>

        <v-text-field v-model="data.ani!.subgroup" class="mb-3" hint="留空则由后端从种子名推断"
                      label="字幕组" persistent-hint/>

        <div class="d-flex ga-2 mb-3">
          <v-btn :loading="busy === 'preview'" prepend-icon="mdi-eye-outline" variant="tonal" @click="doPreview">
            预览剧集
          </v-btn>
        </div>

        <v-table v-if="preview.length" density="compact">
          <thead>
          <tr>
            <th style="width:56px">集</th>
            <th>文件 / 重命名后</th>
            <th style="width:96px">大小</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(it, i) in preview" :key="i">
            <td>{{ it.episode ?? '—' }}</td>
            <td>
              <div class="text-body-2">{{ it.title }}</div>
              <div v-if="it.reName" class="text-caption text-medium-emphasis">→ {{ it.reName }}</div>
            </td>
            <td class="text-caption">{{ it.formatSize || '—' }}</td>
          </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="model = false">取消</v-btn>
        <v-btn :disabled="!data.torrent" :loading="busy === 'start'" color="primary" variant="flat" @click="start">
          开始下载
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
