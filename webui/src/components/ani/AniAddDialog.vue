<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, BgmInfo} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'
import AniEditDialog from './AniEditDialog.vue'
import SourceBrowserDialog from './SourceBrowserDialog.vue'

const model = defineModel<boolean>({required: true})

const ani = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()

const busy = ref(false)
/** 解析出来的订阅，先给人过一眼再入库 */
const pending = ref<Ani | null>(null)

/**
 * 三个番剧源的形式完全一样：填一个 RSS 地址，或者打开番剧列表按星期挑。
 * 差别只有 placeholder 和列表接口，所以共用一套表单。
 */
const SOURCES = [
  {
    id: 'mikan', name: 'Mikan', type: 'mikan',
    ph: 'https://mikanani.me/RSS/Bangumi?bangumiId=xxx&subgroupid=xxx',
  },
  {
    id: 'anibt', name: 'AniBT', type: 'ani-bt',
    ph: 'https://anibt.net/rss/anime.xml?bgmId=xxx&groupSlug=xxx',
  },
  {
    id: 'garden', name: 'AnimeGarden', type: 'anime-garden',
    ph: 'https://api.animes.garden/feed.xml?subject=xxx&fansub=xxx',
  },
] as const

type SourceId = typeof SOURCES[number]['id']

const tab = ref<SourceId | 'other' | 'bgm'>('mikan')
const browsing = ref(false)
const browseSource = ref<SourceId>('mikan')

/** 各来源各记各的地址，切标签页时不会被别的来源覆盖掉 */
const urls = ref<Record<string, string>>({mikan: '', anibt: '', garden: '', other: ''})

/**
 * 从番剧列表挑中的字幕组会连带回填这几项，手填 RSS 时它们是空的。
 *
 * 和 urls 一样按来源分开存，而且记着当时挑的是哪条地址 ——
 * 这三项是「跟着某一条 RSS 地址走的」，不是这个对话框的全局状态。
 * 只存一份的话：在 Mikan 挑了番 A（带着 A 的 Bgm 条目和匹配规则），
 * 退回来切到 AniBT 手填一条番 B 的地址，解析时照样把 A 的 Bgm 和 A 的规则递过去 ——
 * 建出来的订阅指着 B 的 RSS，名字季度集数却是 A 的，规则也永远匹配不上。
 */
type Picked = {url: string; bgmUrl?: string; subgroup?: string; match: string[]}
const picked = ref<Record<string, Picked>>({})
/** 没挑过 / 挑完又手改了地址，都用它 —— 只读，不会被改 */
const NOTHING: Picked = {url: '', match: []}

/** 这一栏挑回来的附带信息。地址被手改过就不算数了：这三样是跟着那一条 RSS 地址走的 */
const pickedOf = (id: string): Picked => {
  const p = picked.value[id]
  return p && p.url === (urls.value[id] ?? '').trim() ? p : NOTHING
}

const current = computed(() => SOURCES.find(s => s.id === tab.value))

function openBrowser(id: SourceId) {
  browseSource.value = id
  browsing.value = true
}

/** 浏览器里选好字幕组和版本 → 回填表单并直接解析，少让人再点一次 */
function onPicked(v: {url: string; bgmUrl?: string; subgroup?: string; match: string[]}) {
  urls.value[browseSource.value] = v.url
  picked.value[browseSource.value] = {url: v.url, bgmUrl: v.bgmUrl, subgroup: v.subgroup, match: v.match}
  tab.value = browseSource.value
  void parse()
}

/* ── 手填 / 回填的 RSS → 订阅对象 ── */
/* 只留 BgmUrl：RssToAniDTO 根本没有 title 字段，标题是后端从 Bgm 条目上取的，
   再摆一个「番剧名称」输入框只会让人以为填了有用 */
const otherBgmUrl = ref('')

async function parse() {
  const isOther = tab.value === 'other'
  const url = (isOther ? urls.value.other : urls.value[tab.value]).trim()
  if (!url) return ui.error('请填写 RSS 地址')
  if (isOther && !otherBgmUrl.value.trim()) {
    // 上游在这一步就拦：没有 Bgm 条目后端认不出番剧名、季度、总集数
    return ui.error('请填写 BgmUrl，或先用搜索选一个 Bangumi 条目')
  }

  const p = isOther ? NOTHING : pickedOf(tab.value)

  busy.value = true
  try {
    /* type 必须带上：AniUtil.getAni 里 type 空着就当 mikan 处理，
       会去 MikanService.getSubgroupId(url) 抠 subgroupId —— AniBT / AnimeGarden 的
       地址里没这个参数，直接抛「获取失败」。取值是后端那个 switch 认的字面量。 */
    const a = await api.rssToAni({
      url,
      type: isOther ? 'other' : current.value!.type,
      bgmUrl: isOther ? otherBgmUrl.value.trim() : p.bgmUrl,
      subgroup: p.subgroup,
      enable: true,
    })
    // rssToAni 不认匹配规则，选好的版本要自己带过去，否则挑了简中还是会全下
    if (p.match.length) a.match = p.match
    pending.value = a
  } finally {
    busy.value = false
  }
}

/* ── Bangumi 搜索：选中条目后后端直接给订阅对象，不经过 RSS ── */
const bgmKeyword = ref('')
const bgmResults = ref<BgmInfo[]>([])

async function searchBgm() {
  const k = bgmKeyword.value.trim()
  if (!k) return
  busy.value = true
  try {
    bgmResults.value = await api.searchBgm(k)
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

/* 展示时把 `{{字幕组}}:` 前缀去掉，只留版本名。
   这个函数不能写成模板里的内联正则 —— 里面的 }} 会被当成插值结束 */
const bare = (m: string) => m.replace(/^\{\{.*?\}\}:/, '')

/** 编辑框确认后真正落库 */
async function onConfirmed(a: Ani) {
  await ani.add(a)
  pending.value = null
  model.value = false
  reset()
}

function reset() {
  urls.value = {mikan: '', anibt: '', garden: '', other: ''}
  picked.value = {}
  otherBgmUrl.value = ''
  bgmKeyword.value = ''
  bgmResults.value = []
}
</script>

<template>
  <v-dialog v-model="model" :fullscreen="mobile" max-width="760" scrollable @after-leave="reset">
    <v-card>
      <v-card-title class="d-flex align-center py-4">
        添加订阅
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="model = false"/>
      </v-card-title>

      <v-tabs v-model="tab" density="comfortable" show-arrows>
        <v-tab v-for="s in SOURCES" :key="s.id" :value="s.id">{{ s.name }}</v-tab>
        <v-tab value="other">其它 RSS</v-tab>
        <v-tab value="bgm">Bangumi</v-tab>
      </v-tabs>
      <v-divider/>

      <v-card-text class="pane">
        <v-tabs-window v-model="tab">
          <!-- ── 三个番剧源共用一套表单 ── -->
          <v-tabs-window-item v-for="s in SOURCES" :key="s.id" :value="s.id">
            <!--
              把「浏览番剧列表」摆在最上面，比 RSS 输入框还显眼：
              没人记得住 bangumiId，正常路径就是按星期翻着挑。
            -->
            <button class="browse" type="button" @click="openBrowser(s.id)">
              <v-icon icon="mdi-calendar-week" size="26"/>
              <span class="browse-text">
                <b>浏览 {{ s.name }} 番剧列表</b>
                <em>按星期看这一季在播什么，挑字幕组和版本</em>
              </span>
              <v-icon icon="mdi-arrow-right" size="20"/>
            </button>

            <div class="or">或者直接填地址</div>

            <v-textarea
                v-model="urls[s.id]" :placeholder="s.ph" auto-grow label="RSS 地址" rows="2"
                persistent-hint hint="不支持聚合订阅：一次更新太多会漏集"/>

            <!-- 从列表挑过来时把选中的东西显式摆出来，不然不知道匹配规则已经带上了 -->
            <div v-if="pickedOf(s.id).subgroup" class="d-flex flex-wrap ga-2 mt-4">
              <v-chip prepend-icon="mdi-account-group" size="small" variant="tonal">{{ pickedOf(s.id).subgroup }}</v-chip>
              <v-chip v-for="m in pickedOf(s.id).match" :key="m" size="small" variant="tonal">
                {{ bare(m) }}
              </v-chip>
              <v-chip v-if="!pickedOf(s.id).match.length" color="success" size="small" variant="tonal">全部版本</v-chip>
            </div>

            <v-btn :loading="busy" class="mt-5" color="primary" prepend-icon="mdi-arrow-right" variant="flat"
                   @click="parse">
              解析
            </v-btn>
          </v-tabs-window-item>

          <!-- ── 其它 RSS ── -->
          <v-tabs-window-item value="other">
            <v-text-field v-model="otherBgmUrl" class="mb-1" label="BgmUrl"
                          placeholder="https://bgm.tv/subject/123456"
                          persistent-hint hint="后端靠它认番剧名、季度和总集数，留空会解析失败">
              <template #append>
                <v-btn icon="mdi-magnify" size="small" variant="tonal" @click="tab = 'bgm'"/>
              </template>
            </v-text-field>
            <v-textarea v-model="urls.other" auto-grow label="RSS 地址" placeholder="https://xxxx.com/a.xml" rows="2"
                        persistent-hint hint="dmhy 等只给磁力链接的 RSS 不支持 Aria2"/>
            <v-btn :loading="busy" class="mt-5" color="primary" prepend-icon="mdi-arrow-right" variant="flat"
                   @click="parse">
              解析
            </v-btn>
          </v-tabs-window-item>

          <!-- ── Bangumi ── -->
          <v-tabs-window-item value="bgm">
            <v-text-field v-model="bgmKeyword" append-inner-icon="mdi-magnify" label="番剧名称"
                          persistent-hint hint="选中条目后由后端直接建订阅，不需要 RSS 地址"
                          @click:append-inner="searchBgm" @keyup.enter="searchBgm"/>
            <v-list v-if="bgmResults.length" class="mt-4 rounded-lg" density="comfortable" lines="two">
              <v-list-item v-for="b in bgmResults" :key="b.id" :subtitle="[b.date, b.name].filter(Boolean).join(' · ')"
                           :title="b.nameCn || b.name" class="mb-1 rounded-lg" @click="pickBgm(b)">
                <template #prepend>
                  <v-avatar class="mr-3" rounded size="44">
                    <v-img :src="b.images?.grid || b.images?.small"/>
                  </v-avatar>
                </template>
                <template #append>
                  <v-icon icon="mdi-chevron-right" size="small"/>
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

  <SourceBrowserDialog v-model="browsing" :source="browseSource" @pick="onPicked"/>

  <!-- 解析出来的订阅先给人过一眼再入库，避免匹配规则不对就开始下载 -->
  <AniEditDialog v-if="pending" :item="pending" is-new @close="pending = null" @submit="onConfirmed"/>
</template>

<style scoped>
/* 表单本身给足留白：上面是 tab，下面是按钮，挤在一起点着容易点错 */
.pane {
    min-height: 380px;
    padding: 24px 24px 28px;
}

.browse {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 18px;
    border: 1px solid rgba(var(--v-theme-primary), .35);
    border-radius: 14px;
    background: rgba(var(--v-theme-primary), .07);
    color: rgb(var(--v-theme-primary));
    text-align: left;
    cursor: pointer;
    transition: background .18s, border-color .18s, transform .18s cubic-bezier(.2, .7, .3, 1);
}

.browse:hover {
    transform: translateY(-1px);
    border-color: rgba(var(--v-theme-primary), .6);
    background: rgba(var(--v-theme-primary), .12);
}

.browse:active {
    transform: none;
}

.browse-text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.browse-text b {
    font-size: 14.5px;
    font-weight: 650;
}

/* 说明文字用正文色而不是主色的半透明：主色压淡后在浅底上到不了 4.5:1 */
.browse-text em {
    font-size: 11.5px;
    font-style: normal;
    color: rgba(var(--v-theme-on-surface), .68);
}

/* 「或者」分隔线：两侧各画一条，中间留字 */
.or {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 16px;
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), .55);
}

.or::before,
.or::after {
    content: '';
    flex: 1 1 auto;
    height: 1px;
    background: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
