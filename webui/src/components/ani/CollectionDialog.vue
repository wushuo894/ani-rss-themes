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

/**
 * 种子读成 base64。
 *
 * 以前是丢给后端 `api/upload?type=getBase64` 换的，但那个 type 开关在上游 3.2.18 之后的
 * 重构里删掉了，改成另一个端点 /api/uploadAndReadToBase64 —— 跟着换就得按后端版本分叉，
 * 老版本上没有那个端点。而合集要的只是那串 base64，文件根本不用上服务器：
 * 浏览器自己读完事，少一跳往返，也就不用管后端是哪一版。
 */
const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onerror = () => reject(r.error ?? new Error('读取失败'))
  // readAsDataURL 回的是 `data:...;base64,xxxx`，后端只要逗号后面那截
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
  r.readAsDataURL(f)
})

// v-file-input 单选时给 File、多选时给 File[]，两种都要接
async function onPick(picked: File | File[]) {
  const fs = Array.isArray(picked) ? picked : picked ? [picked] : []
  const f = fs?.[0]
  if (!f) return
  if (!f.name.endsWith('.torrent')) return ui.error('请选择 .torrent 文件')
  busy.value = 'upload'
  try {
    data.value.torrent = await toBase64(f)
    ui.success('种子已读取')
    await guessSubgroup()
  } catch {
    ui.error('种子读取失败')
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

/*
 * 合集的标题 / TMDB 名和普通订阅一样重要：重命名模板和刮削都按它们走，
 * 名字不对，一整季文件全落错地方。上游合集框里挂着「使用 Bangumi」「使用 TMDB」
 * 「获取 TMDB」「下载位置」四颗，我们一颗都没有 —— 只能听天由命。
 */
async function useBgmName() {
  busy.value = 'bgm'
  try {
    const t = await api.getBgmTitle(data.value.ani ?? {})
    if (!t) return ui.warn('没有查到标题')
    data.value.ani = {...data.value.ani, title: t}
    ui.success('已使用 Bangumi 标题')
  } finally {
    busy.value = ''
  }
}

async function fetchTmdb() {
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName(data.value.ani ?? {})
    if (!r?.themoviedbName) return ui.warn('没有查到 TMDB 名称')
    data.value.ani = {...data.value.ani, themoviedbName: r.themoviedbName, tmdb: r.tmdb}
    ui.success(`已获取：${r.themoviedbName}`)
  } finally {
    busy.value = ''
  }
}

async function showPath() {
  busy.value = 'path'
  try {
    const r = await api.downloadPath(data.value.ani ?? {})
    ui.info(`会下到：${r.downloadPath}`)
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

        <!-- 标题和 TMDB 名决定文件最后落到哪个目录，合集一次就是一整季，错了要全挪 -->
        <v-text-field v-model="data.ani!.title" class="mb-1" label="标题">
          <template #append>
            <v-btn :loading="busy === 'bgm'" size="small" variant="tonal" @click="useBgmName">用 Bgm 名</v-btn>
            <v-btn :disabled="!data.ani?.themoviedbName || data.ani?.title === data.ani?.themoviedbName"
                   class="ml-2" size="small" variant="tonal"
                   @click="data.ani = {...data.ani, title: data.ani!.themoviedbName}">
              用 TMDB 名
            </v-btn>
          </template>
        </v-text-field>

        <v-text-field v-model="data.ani!.themoviedbName" class="mb-1" label="TMDB">
          <template #append>
            <v-btn :loading="busy === 'tmdb'" size="small" variant="tonal" @click="fetchTmdb">获取</v-btn>
          </template>
        </v-text-field>

        <v-text-field v-model="data.ani!.subgroup" class="mb-3" hint="留空则由后端从种子名推断"
                      label="字幕组" persistent-hint/>

        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-btn :loading="busy === 'preview'" prepend-icon="mdi-eye-outline" variant="tonal" @click="doPreview">
            预览剧集
          </v-btn>
          <v-btn :loading="busy === 'path'" prepend-icon="mdi-folder-outline" variant="tonal" @click="showPath">
            下载位置
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
