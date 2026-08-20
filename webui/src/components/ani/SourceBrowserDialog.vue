<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useDisplay} from 'vuetify'
import type {
  Ani, AniBTGroup, AniBTItem, AnimeGardenGroup, AnimeGardenItem, GroupRegexRegexItem,
  MikanGroup, MikanItem, MikanSeason,
} from '@shared/types'
import * as api from '@shared/api'
import {proxyImage} from '@shared/http'
import {formatSize, formatTime, fromNow} from '@shared/format'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

/**
 * 番剧浏览器 —— 「按星期看这一季在播什么」。
 *
 * 上游 Mikan.vue / AniBT.vue / AnimeGarden.vue 是三份 400~500 行、彼此复制的文件。
 * 三个接口返回的其实是同一个形状（季度 + 按星期分的番剧 + 每部番的字幕组），
 * 只是字段名各叫各的，所以这里只写一份，靠下面这张适配表把三家归一。
 *
 * 在这之前，「添加订阅」里这三个来源要人手填 Bangumi 条目 ID —— 谁记得住条目 ID。
 */

const model = defineModel<boolean>({required: true})
const props = defineProps<{
  source: 'mikan' | 'anibt' | 'garden'
  /**
   * 带着一条订阅打开：直接定位到这部番，而不是从整季列表从头翻。
   * 「换个字幕组」是编辑订阅里的常规动作，让人重新搜一遍番名等于没做。
   */
  preset?: Ani
}>()
const emit = defineEmits<{pick: [{url: string; bgmUrl?: string; subgroup?: string; match: string[]}]}>()

const ani = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()

/* ── 归一后的模型 ── */
interface Item {
  /** 取字幕组时要回传的键：mikan 是番剧页 url，另外两家是番剧 id */
  key: string
  title: string
  cover?: string
  score?: number
  exists?: boolean
  bgmUrl?: string
  /** 番剧详情外链，没有就不给跳 */
  link?: string
}

interface Week {label: string; items: Item[]}

interface Group {
  label: string
  rss: string
  bgmUrl?: string
  /** 副标题：更新日 / 连载状态 / 最近更新，各家给什么用什么 */
  sub?: string
  tags?: string[]
  /** 匹配规则候选，选中一组会拼成 {{字幕组}}:正则 */
  regexList: GroupRegexRegexItem[][]
  /** 这个组最近发过的资源。订之前看一眼命名和体积，比订完再来预览省事 */
  items: Res[]
}

/** 三家的资源项字段名不同，取出来的就这几样 */
interface Res {
  title: string
  size: string
  time: string
  magnet?: string
  torrent?: string
}

const SOURCES = {
  mikan: {name: 'Mikan', searchable: true, seasons: true},
  anibt: {name: 'AniBT', searchable: true, seasons: true},
  garden: {name: 'AnimeGarden', searchable: false, seasons: false},
} as const

const meta = computed(() => SOURCES[props.source])

/*
 * 封面走 api/proxyImage：番剧源给的是站外地址，直连会碰上防盗链和 CORS，
 * 后端那一跳还能顺带走代理。
 * 演示构建例外 —— 演示是靠替换 fetch 伪造后端的，而 <img src> 不走 fetch，
 * 拦不住，只能让地址直接用。
 */
const coverOf = (url?: string) => (!url ? '' : __DEMO__ ? url : proxyImage(url))

/* ── 状态 ── */
const loading = ref(false)
const weeks = ref<Week[]>([])
const seasons = ref<{label: string; value: MikanSeason | string}[]>([])
const season = ref('')
const keyword = ref('')
const weekTab = ref(0)

/** 展开中的番剧 → 它的字幕组，取过就缓存，来回点不重复请求 */
const openKey = ref('')
const groups = ref<Record<string, Group[]>>({})
const groupLoading = ref(false)

/** 批量添加的篮子，跨番剧累计 */
const basket = ref<{item: Item; group: Group}[]>([])
const batching = ref(0)

/**
 * 把订阅换成一个「定位条件」。三家各认各的：
 *  - Mikan 只有搜索框，所以拼一个搜索词。它认 `id: 12345` 这种写法（bangumiId），
 *    抠得到就用 id，精确；抠不到退回番名，并且要先把标题里的 `(2024)`、
 *    `[tmdbid=123]` 这些刮削后缀去掉 —— 带着后缀去搜是搜不到的。
 *  - AniBT 和 AnimeGarden 的列表接口直接收 bgmUrl，服务端自己筛。
 * 逻辑照抄上游 Mikan.vue#searchAni / Ani.vue#aniBTShow。
 */
function locate(ani?: Ani): {text: string; bgmUrl: string} {
  if (!ani) return {text: '', bgmUrl: ''}
  const bgmUrl = ani.bgmUrl ?? ''

  if (ani.url) {
    try {
      const id = new URL(ani.url).searchParams.get('bangumiId')
      if (id) return {text: `id: ${id}`, bgmUrl}
    } catch {
      // 地址不合法就当没有，退回按名字搜
    }
  }

  const title = (ani.mikanTitle || ani.title || '')
      .replace(/ ?\((19|20)\d{2}\)/g, '')
      .replace(/ ?\[tmdbid=\d+]/g, '')
      .trim()
  return {text: title.length > 2 ? title : '', bgmUrl}
}

/** 本次打开的定位条件，fetchList 要用 */
const pin = ref<{text: string; bgmUrl: string}>({text: '', bgmUrl: ''})

/* ── 三家的适配 ── */

function mapGroups(list: (MikanGroup | AniBTGroup | AnimeGardenGroup)[]): Group[] {
  return list.map(g => {
    const it = g as MikanGroup & AniBTGroup & AnimeGardenGroup
    return {
      label: it.label || it.name || '未知字幕组',
      rss: it.rss || '',
      // AniBT / AnimeGarden 只给 bgmId，自己拼成条目地址，否则订阅进来是没有 Bgm 的
      bgmUrl: it.bgmUrl || (it.bgmId ? `https://bgm.tv/subject/${it.bgmId}` : undefined),
      sub: it.updateDay || it.status
          || (it.lastUpdatedAt ? `最近更新 ${fromNow(new Date(it.lastUpdatedAt).getTime())}` : ''),
      tags: it.groupRegex?.tags,
      regexList: it.groupRegex?.regexList ?? [],
      items: (it.items ?? []).slice(0, 8).map(r => {
        const x = r as MikanItem & AniBTItem & AnimeGardenItem
        const t = x.createdAt ?? x.publishedAt
        return {
          title: x.title || '',
          size: x.formatSize || (x.size ? formatSize(x.size) : ''),
          time: t ? formatTime(new Date(t).getTime()) : '',
          magnet: x.magnet,
          torrent: x.torrent,
        }
      }),
    }
  }).filter(g => g.rss)
}

async function fetchList() {
  loading.value = true
  openKey.value = ''
  try {
    const k = keyword.value.trim()
    if (props.source === 'mikan') {
      const picked = seasons.value.find(s => s.label === season.value)?.value
      const r = await api.mikan(k, k ? null : (picked as MikanSeason))
      // 搜索结果里不带季度列表，别让它把已有的选择器清空
      if (r.seasons?.length) {
        seasons.value = r.seasons.map(s => ({label: s.seasonLabel || '', value: s}))
        if (!season.value) season.value = r.seasons.find(s => s.select)?.seasonLabel || ''
      }
      weeks.value = (r.weeks || []).map(w => ({
        label: w.weekLabel || '其它',
        items: (w.items || []).map(i => ({
          key: i.url || '', title: i.title || '', cover: i.cover, score: i.score,
          exists: i.exists, bgmUrl: i.bgmUrl, link: i.url,
        })),
      }))
    } else if (props.source === 'anibt') {
      const r = await api.aniBT({
        season: season.value || undefined,
        title: k || undefined,
        bgmUrl: pin.value.bgmUrl || undefined,
      })
      if (r.availableSeasons?.length) {
        seasons.value = r.availableSeasons.map(s => ({label: s, value: s}))
        if (!season.value) season.value = r.requestedSeason || r.currentSeason || ''
      }
      weeks.value = (r.byWeekday || []).map(w => ({
        label: w.weekdayLabel || '其它',
        items: (w.animes || []).map(a => ({
          key: a.bgmId || '',
          title: a.title?.chinese || a.title?.primary || a.title?.romaji || a.title?.english || '',
          cover: a.cover, score: a.rating, exists: a.exists,
          bgmUrl: a.bgmId ? `https://bgm.tv/subject/${a.bgmId}` : undefined,
        })),
      }))
    } else {
      const r = await api.animeGardenList(pin.value.bgmUrl || undefined)
      weeks.value = (r || []).map(w => ({
        label: w.weekLabel || '其它',
        items: (w.subjects || []).map(s => ({
          key: s.id || '', title: s.name || '', cover: s.cover, score: s.score, exists: s.exists,
        })),
      }))
    }
    weeks.value = weeks.value.filter(w => w.items.length)
    if (weekTab.value >= weeks.value.length) weekTab.value = 0
    if (!weeks.value.length) ui.warn('没有查到番剧')
  } finally {
    loading.value = false
  }
}

async function toggleItem(it: Item) {
  if (openKey.value === it.key) {
    openKey.value = ''
    return
  }
  openKey.value = it.key
  if (groups.value[it.key]) return
  groupLoading.value = true
  try {
    const raw = props.source === 'mikan' ? await api.mikanGroup(it.key)
        : props.source === 'anibt' ? await api.aniBTGroup(it.key)
            : await api.animeGardenGroup(it.key)
    groups.value[it.key] = mapGroups(raw)
    if (!groups.value[it.key].length) ui.warn('这部番还没有可用的字幕组 RSS')
  } finally {
    groupLoading.value = false
  }
}

/** 展开中的字幕组（看它最近发了什么），一次只开一个 */
const openRss = ref('')

async function copyMagnet(magnet?: string) {
  if (!magnet) return
  try {
    await navigator.clipboard.writeText(magnet)
    ui.success('磁力链接已复制')
  } catch {
    // http 页面下 clipboard API 不可用（安全上下文限制），退回到老办法
    const el = document.createElement('textarea')
    el.value = magnet
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    ui.success('磁力链接已复制')
  }
}

/* ── 匹配规则选择 ── */
const matchFor = ref<{item: Item; group: Group} | null>(null)
const matchPick = ref('[]')

/** 候选末尾补一个空数组当「全部」，和上游一致 */
const matchOptions = computed(() => [...(matchFor.value?.group.regexList ?? []), []])

function openMatch(item: Item, group: Group) {
  matchFor.value = {item, group}
  matchPick.value = '[]'
}

function confirmMatch() {
  const cur = matchFor.value
  if (!cur) return
  emit('pick', {
    url: cur.group.rss,
    bgmUrl: cur.group.bgmUrl || cur.item.bgmUrl,
    subgroup: cur.group.label,
    // 上游的格式：每条是 `{{字幕组}}:正则`，前缀让后端知道这条规则属于谁
    match: (JSON.parse(matchPick.value) as string[]).map(r => `{{${cur.group.label}}}:${r}`),
  })
  matchFor.value = null
  model.value = false
}

/* ── 批量添加 ── */
const inBasket = (g: Group) => basket.value.some(b => b.group.rss === g.rss)

function toggleBasket(item: Item, group: Group) {
  const i = basket.value.findIndex(b => b.group.rss === group.rss)
  if (i >= 0) basket.value.splice(i, 1)
  else basket.value.push({item, group})
}

/**
 * 同一部番选了多个字幕组时，第一个当主 RSS、其余进备用列表 —— 和上游一样。
 * 上游是从 rss 地址里抠 bangumiId 来分组的，这里直接按番剧的 key 分，少一次 URL 解析。
 */
async function batchAdd() {
  const byAnime = new Map<string, Group[]>()
  for (const b of basket.value) {
    const list = byAnime.get(b.item.key) ?? []
    list.push(b.group)
    byAnime.set(b.item.key, list)
  }

  batching.value = 0
  try {
    for (const list of byAnime.values()) {
      const [main, ...rest] = list
      const a = await api.rssToAni({url: main.rss, bgmUrl: main.bgmUrl, subgroup: main.label, enable: true})
      if (rest.length) a.standbyRssList = rest.map(g => ({label: g.label, url: g.rss, offset: 0}))
      await api.addAni(a)
      batching.value += list.length
    }
    ui.success(`已添加 ${byAnime.size} 部番剧`)
    basket.value = []
    await ani.reload()
    model.value = false
  } finally {
    batching.value = 0
  }
}

/*
 * 打开时拉一次。
 * 带了 preset（从编辑订阅点进来的）就每次都重拉 —— 定位条件变了，缓存的整季列表没用；
 * 没带 preset 就沿用上次的结果，来回开关不白等。
 */
watch(model, v => {
  if (!v) return
  basket.value = []
  const next = locate(props.preset)
  const changed = next.text !== pin.value.text || next.bgmUrl !== pin.value.bgmUrl
  pin.value = next
  if (props.preset) {
    keyword.value = next.text
    // 换了一部番，季度也要重挑，否则会拿上一部番的季度去筛
    if (changed) season.value = ''
    void fetchList()
    return
  }
  if (!weeks.value.length) void fetchList()
})
watch(season, (v, old) => {
  if (old !== '' && v !== old) void fetchList()
})

/** AnimeGarden 没有服务端搜索，本地过滤 */
const shownItems = computed(() => {
  const w = weeks.value[weekTab.value]
  if (!w) return []
  const k = keyword.value.trim().toLowerCase()
  if (!k || meta.value.searchable) return w.items
  return w.items.filter(i => i.title.toLowerCase().includes(k))
})

function search() {
  if (meta.value.searchable) void fetchList()
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="1100" scrollable>
    <v-card class="browser">
      <v-card-title class="d-flex align-center ga-3 py-4">
        <v-icon icon="mdi-calendar-week" size="22"/>
        <span>{{ meta.name }} 番剧列表</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>

      <!-- 工具条：搜索 + 季度 + 按钮。三样都可能不存在，用 gap 撑开而不是塞满 -->
      <div class="toolbar">
        <v-text-field
            v-model="keyword" :placeholder="meta.searchable ? '搜索番剧名' : '在本季结果里过滤'"
            class="tool-search" clearable density="comfortable" flat hide-details
            prepend-inner-icon="mdi-magnify" variant="solo-filled"
            @click:clear="search" @keyup.enter="search"/>
        <v-select
            v-if="meta.seasons && seasons.length" v-model="season" :items="seasons.map(s => s.label)"
            class="tool-season" density="comfortable" flat hide-details label="季度" variant="solo-filled"/>
        <v-btn v-if="meta.searchable" :loading="loading" class="tool-btn" color="primary"
               prepend-icon="mdi-magnify" variant="tonal" @click="search">
          搜索
        </v-btn>
      </div>

      <!-- 星期条：这就是「一键按星期看」。今天排在最前，后端已经排好序 -->
      <v-tabs v-if="weeks.length" v-model="weekTab" class="weekbar" density="comfortable" show-arrows>
        <v-tab v-for="(w, i) in weeks" :key="w.label" :value="i">
          {{ w.label }}
          <v-chip class="ml-2" size="x-small" variant="tonal">{{ w.items.length }}</v-chip>
        </v-tab>
      </v-tabs>
      <v-divider/>

      <v-card-text class="body">
        <div v-if="loading" class="grid">
          <v-skeleton-loader v-for="i in 8" :key="i" class="rounded-lg" type="list-item-avatar-two-line"/>
        </div>

        <v-empty-state v-else-if="!weeks.length" icon="mdi-calendar-remove"
                       text="换个关键词或季度再试" title="这里还没有番剧"/>

        <div v-else class="grid">
          <div v-for="it in shownItems" :key="it.key" :class="{open: openKey === it.key}" class="tile">
            <button class="tile-head" type="button" @click="toggleItem(it)">
              <div class="cover">
                <v-img v-if="it.cover" :src="coverOf(it.cover)" cover>
                  <template #placeholder>
                    <div class="cover-ph">
                      <v-icon icon="mdi-image-outline" size="20"/>
                    </div>
                  </template>
                </v-img>
                <div v-else class="cover-ph">
                  <v-icon icon="mdi-television-classic" size="22"/>
                </div>
                <span v-if="it.exists" class="flag">已订阅</span>
              </div>
              <div class="tile-meta">
                <div class="tile-title">{{ it.title }}</div>
                <div class="tile-sub">
                  <span v-if="it.score" class="score">★ {{ it.score.toFixed(1) }}</span>
                  <span>{{ openKey === it.key ? '收起字幕组' : '看字幕组' }}</span>
                </div>
              </div>
              <v-icon :class="{flip: openKey === it.key}" class="chev" icon="mdi-chevron-down" size="20"/>
            </button>

            <v-expand-transition>
              <div v-if="openKey === it.key" class="groups">
                <div v-if="groupLoading" class="groups-load">
                  <v-progress-circular indeterminate size="22" width="2"/>
                </div>
                <template v-else>
                  <div v-for="g in groups[it.key] || []" :key="g.rss">
                  <div class="group">
                    <v-checkbox-btn :model-value="inBasket(g)" density="compact"
                                    @update:model-value="toggleBasket(it, g)"/>
                    <div class="group-meta">
                      <div class="group-name">{{ g.label }}</div>
                      <div v-if="g.sub" class="group-sub">{{ g.sub }}</div>
                      <div v-if="g.tags?.length" class="group-tags">
                        <v-chip v-for="t in g.tags" :key="t" size="x-small" variant="tonal">{{ t }}</v-chip>
                      </div>
                    </div>
                    <v-btn color="primary" prepend-icon="mdi-plus" size="small" variant="tonal"
                           @click="openMatch(it, g)">
                      添加
                    </v-btn>
                    <!-- 展开看这个组最近发了什么：命名、体积、发布时间，
                         订之前扫一眼就知道这个组合不合适 -->
                    <v-btn v-if="g.items.length" :icon="openRss === g.rss ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                           :title="openRss === g.rss ? '收起最近资源' : '看最近资源'" size="small" variant="text"
                           @click="openRss = openRss === g.rss ? '' : g.rss"/>
                  </div>

                  <v-expand-transition>
                    <div v-if="openRss === g.rss" class="res">
                      <div v-for="(r, ri) in g.items" :key="ri" class="res-row">
                        <div class="res-meta">
                          <div class="res-title">{{ r.title }}</div>
                          <div class="res-sub">{{ [r.size, r.time].filter(Boolean).join(' · ') }}</div>
                        </div>
                        <v-btn v-if="r.magnet" icon="mdi-magnet" size="x-small" title="复制磁力链接"
                               variant="text" @click="copyMagnet(r.magnet)"/>
                        <v-btn v-if="r.torrent" :href="r.torrent" icon="mdi-download-outline" rel="noopener"
                               size="x-small" target="_blank" title="下载种子" variant="text"/>
                      </div>
                    </div>
                  </v-expand-transition>
                  </div>
                  <a v-if="it.link" :href="it.link" class="group-link" rel="noopener" target="_blank">
                    在 {{ meta.name }} 打开
                    <v-icon icon="mdi-open-in-new" size="13"/>
                  </a>
                </template>
              </div>
            </v-expand-transition>
          </div>
        </div>
      </v-card-text>

      <!-- 选了才出现：没选东西时摆一条灰工具条只会让人以为坏了 -->
      <v-slide-y-reverse-transition>
        <div v-if="basket.length" class="basket">
          <span class="text-body-2">已选 {{ basket.length }} 个字幕组</span>
          <v-spacer/>
          <v-btn size="small" variant="text" @click="basket = []">清空</v-btn>
          <v-btn :loading="batching > 0" color="primary" prepend-icon="mdi-plus-box-multiple"
                 size="small" variant="flat" @click="batchAdd">
            批量添加{{ batching ? `（${batching}/${basket.length}）` : '' }}
          </v-btn>
        </div>
      </v-slide-y-reverse-transition>
    </v-card>
  </v-dialog>

  <!-- 匹配规则：一个字幕组常常同时发简繁 / 多分辨率，不挑就会一集下好几遍 -->
  <v-dialog :model-value="!!matchFor" max-width="520" @update:model-value="matchFor = null">
    <v-card v-if="matchFor">
      <v-card-title class="pt-4">选择要下载的版本</v-card-title>
      <v-card-subtitle class="pb-4">{{ matchFor.group.label }} · {{ matchFor.item.title }}</v-card-subtitle>
      <v-divider/>
      <v-card-text class="py-3">
        <v-radio-group v-model="matchPick" hide-details>
          <v-radio v-for="(opt, i) in matchOptions" :key="i" :value="JSON.stringify(opt.map(o => o.regex))">
            <template #label>
              <div class="d-flex flex-wrap ga-2 py-1">
                <v-chip v-for="o in opt" :key="o.regex" size="small" variant="tonal">{{ o.label }}</v-chip>
                <v-chip v-if="!opt.length" color="success" size="small" variant="tonal">全部</v-chip>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-spacer/>
        <v-btn variant="text" @click="matchFor = null">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="confirmMatch">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.browser {
    display: flex;
    flex-direction: column;
}

/* 工具条：三件套之间给 12px，别贴在一起；窄屏让搜索自己掉一行 */
.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 0 20px 16px;
}

.tool-search {
    flex: 1 1 240px;
    min-width: 0;
}

.tool-season {
    flex: 0 1 170px;
    min-width: 140px;
}

/* 和 comfortable 的输入框同高，并排放着才像一排 */
.tool-btn {
    height: 48px;
}

.weekbar {
    padding: 0 12px;
}

.body {
    padding: 20px;
}

/* 海报网格：auto-fill 让窄屏自己掉到一列，不用写断点 */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
    gap: 14px;
    align-items: start;
}

.tile {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 14px;
    background: rgba(var(--v-theme-on-surface), .02);
    overflow: hidden;
    transition: border-color .18s, box-shadow .18s, transform .18s cubic-bezier(.2, .7, .3, 1);
}

.tile:hover {
    transform: translateY(-2px);
    border-color: rgba(var(--v-theme-primary), .5);
    box-shadow: 0 10px 24px -18px rgb(var(--v-theme-on-surface));
}

/* 展开的那张不再跟着浮起来 —— 它已经是当前焦点，再抬一次只会抖 */
.tile.open,
.tile.open:hover {
    transform: none;
    border-color: rgba(var(--v-theme-primary), .6);
}

.tile-head {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px;
    text-align: left;
    background: none;
    border: 0;
    cursor: pointer;
}

.cover {
    position: relative;
    flex: 0 0 auto;
    width: 54px;
    height: 74px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(var(--v-theme-on-surface), .06);
}

.cover-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: rgba(var(--v-theme-on-surface), .38);
}

.flag {
    position: absolute;
    inset: auto 0 0 0;
    padding: 2px 0;
    font-size: 10px;
    text-align: center;
    color: #fff;
    /* 不用 primary：主题色可能是浅色，白字压不住 */
    background: rgba(0, 0, 0, .68);
}

.tile-meta {
    flex: 1 1 auto;
    min-width: 0;
}

.tile-title {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.35;
    /* 番剧名很长，压两行，超出省略 */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

.tile-sub {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 11.5px;
    color: rgba(var(--v-theme-on-surface), .62);
}

.score {
    color: rgb(var(--v-theme-warning));
    font-weight: 600;
}

.chev {
    flex: 0 0 auto;
    color: rgba(var(--v-theme-on-surface), .5);
    transition: transform .2s;
}

.chev.flip {
    transform: rotate(180deg);
}

.groups {
    padding: 4px 10px 10px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.groups-load {
    display: flex;
    justify-content: center;
    padding: 18px 0;
}

/* 每个字幕组一行，行与行之间 6px —— 挨着放会分不清哪个复选框管哪一行 */
.group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 6px 8px 0;
    border-radius: 10px;
}

.groups > template + div,
.groups > div + div {
    margin-top: 6px;
}

.group:hover {
    background: rgba(var(--v-theme-on-surface), .04);
}

.group-meta {
    flex: 1 1 auto;
    min-width: 0;
}

.group-name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-sub {
    margin-top: 2px;
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface), .62);
}

.group-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
}

/* 资源列表：缩进一格挂在字幕组下面，视觉上从属关系一眼看得出来 */
.res {
    margin: 4px 0 8px 34px;
    padding-left: 12px;
    border-left: 2px solid rgba(var(--v-theme-primary), .3);
}

.res-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 0;
}

.res-row + .res-row {
    border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * .6));
}

.res-meta {
    flex: 1 1 auto;
    min-width: 0;
}

/* 种子名又长又不带空格，不截断会把整张卡撑爆 */
.res-title {
    font-size: 11.5px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.res-sub {
    margin-top: 1px;
    font-size: 10.5px;
    color: rgba(var(--v-theme-on-surface), .6);
}

.group-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 10px 0 2px 6px;
    font-size: 12px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.group-link:hover {
    text-decoration: underline;
}

.basket {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgba(var(--v-theme-primary), .08);
}
</style>
