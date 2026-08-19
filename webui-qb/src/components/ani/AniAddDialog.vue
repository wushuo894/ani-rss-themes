<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, BgmInfo} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'
import AniEditDialog from './AniEditDialog.vue'

const model = defineModel<boolean>({required: true})

const ani = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()

const tab = ref('rss')
const busy = ref(false)

/**
 * 五个来源最后都归到同一步：拿到一个 RSS 地址 → rssToAni 换成订阅对象 → 打开编辑框确认。
 * 所以这里只维护「候选组」和「确认中的订阅」两个状态，各来源只负责把候选填进来。
 */
interface Candidate {
  label: string
  rss: string
  sub?: string
  cover?: string
  bgmUrl?: string
}

const candidates = ref<Candidate[]>([])
const pending = ref<Ani | null>(null)

/* ── 1. 直接填 RSS ── */
const rssUrl = ref('')

async function fromRss() {
  if (!rssUrl.value.trim()) return ui.error('请填写 RSS 地址')
  busy.value = true
  try {
    pending.value = await api.rssToAni({url: rssUrl.value.trim(), enable: true})
  } finally {
    busy.value = false
  }
}

/* ── 2. Bangumi 搜索：选中条目后后端直接给订阅对象，不经过 RSS ── */
const bgmKeyword = ref('')
const bgmResults = ref<BgmInfo[]>([])

async function searchBgm() {
  if (!bgmKeyword.value.trim()) return
  busy.value = true
  try {
    bgmResults.value = await api.searchBgm(bgmKeyword.value.trim())
    if (!bgmResults.value.length) ui.warn('没有搜到条目')
  } finally {
    busy.value = false
  }
}

async function pickBgm(b: BgmInfo) {
  busy.value = true
  try {
    pending.value = await api.getAniBySubjectId(String(b.id))
  } finally {
    busy.value = false
  }
}

/* ── 3~5. Mikan / AniBT / AnimeGarden：搜索出字幕组，每组带一个 RSS ── */
const srcKeyword = ref('')

async function searchSource(kind: 'mikan' | 'anibt' | 'garden') {
  const k = srcKeyword.value.trim()
  if (!k) return
  busy.value = true
  candidates.value = []
  try {
    if (kind === 'mikan') {
      const info = await api.mikan(k, null)
      candidates.value = (info.groups || []).map(g => ({
        label: g.label || '未知字幕组',
        rss: g.rss || '',
        sub: g.updateDay,
        cover: info.cover,
        bgmUrl: g.bgmUrl || info.bgmUrl,
      }))
    } else if (kind === 'anibt') {
      // AniBT / AnimeGarden 都按 bgmId 取组，这里先用关键词当 bgmId 试
      const groups = await api.aniBTGroup(k)
      candidates.value = groups.map(g => ({
        label: g.name || '未知字幕组',
        rss: g.rss || '',
        sub: g.status,
      }))
    } else {
      const groups = await api.animeGardenGroup(k)
      candidates.value = groups.map(g => ({
        label: g.name || '未知字幕组',
        rss: g.rss || '',
        sub: g.lastUpdatedAt,
      }))
    }
    if (!candidates.value.length) ui.warn('没有找到字幕组')
  } finally {
    busy.value = false
  }
}

async function pickCandidate(c: Candidate) {
  if (!c.rss) return ui.error('该字幕组没有可用的 RSS 地址')
  busy.value = true
  try {
    pending.value = await api.rssToAni({url: c.rss, bgmUrl: c.bgmUrl, subgroup: c.label, enable: true})
  } finally {
    busy.value = false
  }
}

/** 编辑框确认后真正落库 */
async function onConfirmed(a: Ani) {
  await ani.add(a)
  pending.value = null
  model.value = false
  reset()
}

function reset() {
  rssUrl.value = ''
  bgmKeyword.value = ''
  srcKeyword.value = ''
  bgmResults.value = []
  candidates.value = []
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="720" scrollable @after-leave="reset">
    <v-card>
      <v-card-title class="d-flex align-center">
        添加订阅
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>

      <v-tabs v-model="tab" density="comfortable" show-arrows>
        <v-tab value="rss">RSS 地址</v-tab>
        <v-tab value="bgm">Bangumi</v-tab>
        <v-tab value="mikan">Mikan</v-tab>
        <v-tab value="anibt">AniBT</v-tab>
        <v-tab value="garden">AnimeGarden</v-tab>
      </v-tabs>
      <v-divider/>

      <v-card-text style="min-height: 340px">
        <v-tabs-window v-model="tab">
          <!-- RSS -->
          <v-tabs-window-item value="rss">
            <v-textarea v-model="rssUrl" auto-grow label="RSS 地址" rows="3"
                        hint="蜜柑计划、AniBT、AnimeGarden 等站点的订阅地址都可以" persistent-hint/>
            <v-btn :loading="busy" class="mt-4" color="primary" prepend-icon="mdi-arrow-right" @click="fromRss">
              解析
            </v-btn>
          </v-tabs-window-item>

          <!-- Bangumi -->
          <v-tabs-window-item value="bgm">
            <v-text-field v-model="bgmKeyword" append-inner-icon="mdi-magnify" label="番剧名称"
                          @click:append-inner="searchBgm" @keyup.enter="searchBgm"/>
            <v-list v-if="bgmResults.length" class="mt-2" density="comfortable">
              <v-list-item v-for="b in bgmResults" :key="b.id" :subtitle="`${b.date || ''} · ${b.name || ''}`"
                           :title="b.nameCn || b.name" @click="pickBgm(b)">
                <template #prepend>
                  <v-avatar rounded size="40">
                    <v-img :src="b.images?.grid || b.images?.small"/>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>

          <!-- 三个番剧源共用一套列表 -->
          <v-tabs-window-item v-for="k in (['mikan', 'anibt', 'garden'] as const)" :key="k" :value="k">
            <v-text-field
                v-model="srcKeyword"
                :hint="k === 'mikan' ? '按番剧名搜索' : '填 Bangumi 条目 ID'"
                :label="k === 'mikan' ? '番剧名称' : 'Bangumi ID'"
                append-inner-icon="mdi-magnify"
                persistent-hint
                @click:append-inner="searchSource(k)"
                @keyup.enter="searchSource(k)"
            />
            <v-list v-if="candidates.length" class="mt-2" density="comfortable">
              <v-list-item v-for="(c, i) in candidates" :key="i" :subtitle="c.sub" :title="c.label"
                           @click="pickCandidate(c)">
                <template #append>
                  <v-icon size="small">mdi-chevron-right</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>
        </v-tabs-window>

        <v-overlay :model-value="busy" class="align-center justify-center" contained persistent>
          <v-progress-circular indeterminate/>
        </v-overlay>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- 解析出来的订阅先给人过一眼再入库，避免匹配规则不对就开始下载 -->
  <AniEditDialog v-if="pending" :item="pending" is-new @close="pending = null" @submit="onConfirmed"/>
</template>
