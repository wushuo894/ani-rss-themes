<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import * as api from '@shared/api'
import type {TmdbGroup} from '@shared/api'
import {useUiStore} from '@/stores/ui'
import StringListField from '@/components/common/StringListField.vue'
import SourceBrowserDialog from './SourceBrowserDialog.vue'
import PreviewDialog from './PreviewDialog.vue'

const props = defineProps<{
  item: Ani
  /** 新建模式：不直接调接口，把改好的对象交给调用方去 addAni */
  isNew?: boolean
}>()
const emit = defineEmits<{close: []; submit: [Ani]}>()

const ani = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()

/** 深拷贝一份改，取消时原对象不受影响 */
const form = ref<Ani>(JSON.parse(JSON.stringify(props.item)))
const tab = ref('basic')
const saving = ref(false)
/** 勾上后后端会把已下载的文件一并移动到新路径，是破坏性操作，默认关 */
const move = ref(false)

const dialog = ref(true)
function close() {
  dialog.value = false
  emit('close')
}

async function save() {
  saving.value = true
  try {
    if (props.isNew) {
      emit('submit', form.value)
    } else {
      await ani.update(form.value, move.value)
      close()
    }
  } finally {
    saving.value = false
  }
}

/* ── 几个「按当前表单去后端算一下」的辅助动作 ── */
const busy = ref('')

/*
 * 换字幕组 / 换 RSS：带着这条订阅去对应的番剧站，直接定位到这部番。
 *
 * 上游主 RSS 那一栏下面就挂着 Mikan / AniBT / AnimeGarden 三颗图标按钮，
 * 我们之前一颗都没有 —— 想换个字幕组只能自己去网站上找 RSS 地址粘回来，
 * 比上游还退了一步。
 */
type SourceId = 'mikan' | 'anibt' | 'garden'

const SOURCES: {id: SourceId; name: string; icon: string}[] = [
  {id: 'mikan', name: 'Mikan', icon: 'mdi-alpha-m-circle-outline'},
  {id: 'anibt', name: 'AniBT', icon: 'mdi-alpha-b-circle-outline'},
  {id: 'garden', name: 'AnimeGarden', icon: 'mdi-flower-outline'},
]

const browsing = ref(false)
const browseSource = ref<SourceId>('mikan')

function browse(id: SourceId) {
  browseSource.value = id
  browsing.value = true
}

/**
 * 从番剧站挑完回来：换掉 RSS 和字幕组，并把匹配规则换成新组的。
 *
 * 关键是先剔除旧的同字幕组规则再追加 —— 上游那句 filter 就是干这个的。
 * 不剔的话，来回换几次字幕组，match 里会积一堆早就不用的 `{{某组}}:xxx`，
 * 而这些规则是「或」的关系，等于把过滤条件一点点放宽到形同虚设。
 */
function onPicked(v: {url: string; bgmUrl?: string; subgroup?: string; match: string[]}) {
  form.value.url = v.url
  if (v.bgmUrl) form.value.bgmUrl = v.bgmUrl
  const sub = v.subgroup ?? ''
  form.value.subgroup = sub
  const kept = (form.value.match ?? []).filter(m => !m.startsWith(`{{${sub}}}:`))
  form.value.match = [...kept, ...v.match]
  ui.success(`已换成 ${sub || '所选字幕组'} 的 RSS`)
}

/* ── TMDB ── */

/** TMDB 条目页地址：剧场版走 movie，其余走 tv —— 上游就是按 ova 分的 */
const tmdbUrl = computed(() => {
  const id = tmdbId.value
  return id ? `https://www.themoviedb.org/${form.value.ova ? 'movie' : 'tv'}/${id}` : ''
})

/** 按 TmdbId 反查：番名被改过、或同名番太多时，按标题搜是搜不准的 */
const askTmdbId = ref(false)
const tmdbIdInput = ref('')

async function applyTmdbId() {
  const id = tmdbIdInput.value.trim()
  if (!id) return
  askTmdbId.value = false
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName({...form.value, tmdbId: id} as Ani)
    if (!r?.themoviedbName) return ui.warn('这个 TmdbId 没查到条目')
    form.value.themoviedbName = r.themoviedbName
    if (r.tmdb) form.value.tmdb = r.tmdb
    ui.success(`已获取：${r.themoviedbName}`)
  } finally {
    busy.value = ''
  }
}

/* ── 底部「其他」：刷新 / 刮削 / 强制刮削 ── */
const previewing = ref(false)

const MORE = [
  {key: 'refresh', title: '刷新这一条', subtitle: '立刻按当前规则跑一遍 RSS', icon: 'mdi-refresh'},
  {key: 'scrape', title: '刮削', subtitle: '生成 nfo 和封面，已刮过的跳过', icon: 'mdi-image-text'},
  {key: 'scrapeF', title: '强制刮削', subtitle: '忽略已有结果，整条重做', icon: 'mdi-image-sync-outline'},
] as const

async function runMore(key: typeof MORE[number]['key']) {
  busy.value = key
  try {
    if (key === 'refresh') {
      await api.refreshAni(form.value)
      ui.success('已触发刷新')
    } else {
      await api.scrape(key === 'scrapeF', form.value)
      ui.success(key === 'scrapeF' ? '已触发强制刮削' : '已触发刮削')
    }
  } finally {
    busy.value = ''
  }
}

async function pickTmdbName() {
  busy.value = 'tmdb'
  try {
    const r = await api.getThemoviedbName(form.value)
    if (r?.themoviedbName) {
      form.value.themoviedbName = r.themoviedbName
      // 剧集组信息也一并回填，否则下次保存会把它清掉
      if (r.tmdb) form.value.tmdb = r.tmdb
      ui.success(`已获取：${r.themoviedbName}`)
    } else {
      ui.warn('没有查到 TMDB 名称')
    }
  } finally {
    busy.value = ''
  }
}

async function pickBgmTitle() {
  busy.value = 'bgm'
  try {
    const t = await api.getBgmTitle(form.value)
    if (t) {
      form.value.title = t
      ui.success('已获取标题')
    } else {
      ui.warn('没有查到标题')
    }
  } finally {
    busy.value = ''
  }
}

/*
 * TMDB 剧集组。
 *
 * 原来这儿是个让人手打组 id 的输入框 —— 那串 id 只有 themoviedb.org 的页面地址里有，
 * 谁会去翻。上游是弹一张列表让人挑，每条带「按什么分的、几组、几集」，
 * 挑错组会导致整季集数对不上，这三个数就是用来分辨的。
 *
 * 前置条件是 ani.tmdb.id —— 接口第一行就 Assert.notBlank(tmdb.getId())，
 * 所以没取过 TMDB 时先提示去点「获取」，别让人对着一个空列表猜。
 */
const groups = ref<TmdbGroup[]>([])
const groupOpen = ref(false)

const tmdbId = computed(() => {
  const t = form.value.tmdb
  return t && typeof t === 'object' ? String((t as {id?: string}).id ?? '') : ''
})

const tmdbGroupId = computed({
  get: () => {
    const t = form.value.tmdb
    return t && typeof t === 'object' ? String((t as {tmdbGroupId?: string}).tmdbGroupId ?? '') : ''
  },
  set: (v: string) => {
    form.value.tmdb = {...(form.value.tmdb as object || {}), tmdbGroupId: v}
  },
})

async function openGroups() {
  if (!tmdbId.value) return ui.warn('先点 TMDB 那一栏的「获取」，拿到条目之后才能列剧集组')
  groupOpen.value = true
  busy.value = 'group'
  try {
    groups.value = await api.getThemoviedbGroup(form.value)
    if (!groups.value.length) ui.info('这个条目没有剧集组，按默认播出顺序算集数')
  } finally {
    busy.value = ''
  }
}

function pickGroup(g: TmdbGroup) {
  tmdbGroupId.value = g.id ?? ''
  groupOpen.value = false
  ui.success(`已选择剧集组：${g.name ?? g.id}`)
}

/**
 * 算出「不启用自定义路径时会下到哪」，并把结果填进模板框。
 *
 * 上游就是这么做的：算之前先把 customDownloadPath 置 false，拿到的才是全局模板
 * 算出来的真实路径 —— 不置的话后端会拿你正在编辑的这个模板去算，等于原样返回。
 * 填进去而不是弹个提示：这一步的用处是「拿默认路径当起点改」，只给人看等于白算。
 */
async function fillDownloadPath() {
  busy.value = 'path'
  try {
    const r = await api.downloadPath({...form.value, customDownloadPath: false})
    form.value.customDownloadPathTemplate = r.downloadPath
    ui.success('已填入当前的默认下载位置')
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="820" scrollable @after-leave="emit('close')">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">{{ isNew ? '确认订阅信息' : '编辑订阅' }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="close"/>
      </v-card-title>

      <v-tabs v-model="tab" density="comfortable">
        <v-tab value="basic">基本</v-tab>
        <v-tab value="custom">自定义</v-tab>
        <v-tab value="other">其它</v-tab>
      </v-tabs>

      <v-divider/>

      <v-card-text style="min-height: 440px">
        <v-tabs-window v-model="tab">
          <!-- ══ 基本 ══ -->
          <v-tabs-window-item value="basic">
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="form.title" label="标题">
                  <template #append>
                    <v-btn :loading="busy === 'bgm'" size="small" variant="tonal" @click="pickBgmTitle">
                      用 Bgm 名
                    </v-btn>
                    <!-- 刮削按 TMDB 名走，标题和它不一致时目录名会对不上，
                         上游给了这颗一键对齐的按钮 -->
                    <v-btn :disabled="!form.themoviedbName || form.title === form.themoviedbName"
                           class="ml-2" size="small" variant="tonal"
                           @click="form.title = form.themoviedbName">
                      用 TMDB 名
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field v-model="form.themoviedbName" label="TMDB">
                  <template v-if="tmdbUrl" #append-inner>
                    <!-- 条目页可点：核对刮到的是不是同一部（同名不同年的番很常见） -->
                    <a :href="tmdbUrl" class="tmdb-link" rel="noopener" target="_blank" @click.stop>
                      <v-icon icon="mdi-open-in-new" size="16"/>
                    </a>
                  </template>
                  <template #append>
                    <v-btn icon="mdi-magnify" size="small" title="按 TmdbId 反查" variant="tonal"
                           @click="tmdbIdInput = tmdbId; askTmdbId = true"/>
                    <v-btn :loading="busy === 'tmdb'" class="ml-2" size="small" title="按标题重新获取"
                           variant="tonal" @click="pickTmdbName">
                      获取
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="tmdbGroupId" label="剧集组" placeholder="默认播出顺序"
                              persistent-hint hint="集数对不上时换一个">
                  <template #append>
                    <v-btn :loading="busy === 'group'" size="small" variant="tonal" @click="openGroups">
                      选择
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field v-model="form.bgmUrl" label="BgmUrl"/>
              </v-col>
              <v-col cols="12" md="4">
                <!-- 字幕组名是可以改的：RSS 解析猜错时这一栏没法改，卡片上就一直挂着
                     「未知字幕组」，重命名模板里的 ${subgroup} 也跟着错 -->
                <v-text-field v-model="form.subgroup" label="字幕组" placeholder="未知字幕组"/>
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.url" auto-grow label="主 RSS" rows="2"/>
                <!--
                  换字幕组的入口。上游主 RSS 底下就挂着这三颗，
                  少了它们，想换个组只能自己上网站找 RSS 粘回来 —— 比上游还退一步。
                  点开是带着这条订阅定位过去的，不用重新搜番名。
                -->
                <div class="d-flex flex-wrap align-center ga-2 mt-2">
                  <span class="text-caption text-medium-emphasis mr-1">换字幕组：</span>
                  <v-btn v-for="src in SOURCES" :key="src.id" :prepend-icon="src.icon"
                         size="small" variant="tonal" @click="browse(src.id)">
                    {{ src.name }}
                  </v-btn>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="text-caption text-medium-emphasis mb-2">备用 RSS</div>
                <div v-if="!form.standbyRssList?.length" class="text-caption text-disabled mb-2">未配置</div>
                <div v-for="(s, i) in form.standbyRssList || []" :key="i" class="d-flex ga-3 mb-3">
                  <v-text-field v-model="s.label" density="compact" hide-details label="名称" style="max-width: 180px"/>
                  <v-text-field v-model="s.url" density="compact" hide-details label="地址"/>
                  <v-text-field v-model.number="s.offset" density="compact" hide-details label="偏移"
                                style="max-width: 90px" type="number"/>
                  <v-btn color="error" icon="mdi-close" size="small" variant="text"
                         @click="form.standbyRssList!.splice(i, 1)"/>
                </div>
                <v-btn prepend-icon="mdi-plus" size="small" variant="tonal"
                       @click="form.standbyRssList = [...(form.standbyRssList || []), {label: '', url: '', offset: 0}]">
                  添加备用 RSS
                </v-btn>
              </v-col>

              <v-col cols="6" md="3">
                <v-text-field v-model="form.releaseDate" label="日期" placeholder="yyyy-MM-dd"/>
              </v-col>
              <!-- 剧场版没有「季」和「集数偏移」，上游这两栏在 ova 下是禁用的 -->
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.season" :disabled="form.ova" label="季" type="number"/>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.offset" :disabled="form.ova" label="集数偏移" type="number"/>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.totalEpisodeNumber" label="总集数" type="number"/>
              </v-col>

              <v-col cols="12" md="6">
                <StringListField v-model="form.match" label="匹配"/>
              </v-col>
              <v-col cols="12" md="6">
                <StringListField v-model="form.exclude" label="排除"/>
              </v-col>

              <v-col cols="12">
                <div class="d-flex flex-wrap ga-6 mt-1">
                  <v-switch v-model="form.globalExclude" color="primary" hide-details label="全局排除"/>
                  <v-switch v-model="form.ova" color="primary" hide-details label="剧场版"/>
                  <v-switch v-model="form.enable" color="primary" hide-details label="启用"/>
                </div>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- ══ 自定义 ══ -->
          <v-tabs-window-item value="custom">
            <v-expansion-panels multiple variant="accordion">
              <v-expansion-panel title="自定义集数规则">
                <template #text>
                  <v-switch v-model="form.customEpisode" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customEpisodeStr" :disabled="!form.customEpisode" label="正则"/>
                  <v-text-field v-model.number="form.customEpisodeGroupIndex" :disabled="!form.customEpisode"
                                class="mt-3" label="捕获组序号" type="number"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义路径">
                <template #text>
                  <v-switch v-model="form.customDownloadPath" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customDownloadPathTemplate" :disabled="!form.customDownloadPath"
                                label="路径模版"/>
                  <div class="d-flex align-center flex-wrap ga-2 mt-3">
                    <v-btn :disabled="!form.customDownloadPath" :loading="busy === 'path'" size="small"
                           variant="tonal" @click="fillDownloadPath">
                      填入默认位置
                    </v-btn>
                    <span class="text-caption text-medium-emphasis">最终位置以「预览」为准</span>
                  </div>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义上传">
                <template #text>
                  <v-switch v-model="form.customUploadEnable" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customUploadPathTarget" :disabled="!form.customUploadEnable"
                                label="上传目标路径"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义完结迁移">
                <template #text>
                  <v-switch v-model="form.customCompleted" color="primary" hide-details label="启用" class="mb-2"/>
                  <v-text-field v-model="form.customCompletedPathTemplate" :disabled="!form.customCompleted"
                                label="完结后迁移路径模版"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="重命名模版">
                <template #text>
                  <v-switch v-model="form.customRenameTemplateEnable" color="primary" hide-details label="启用"
                            class="mb-2"/>
                  <v-text-field v-model="form.customRenameTemplate" :disabled="!form.customRenameTemplateEnable"
                                label="模版" placeholder="${title} S${seasonFormat}E${episodeFormat}"/>
                  <a class="text-caption doc-link" href="https://docs.wushuo.top/config/basic/rename#rename-template"
                     rel="noopener" target="_blank">
                    可用占位符看文档
                    <v-icon icon="mdi-open-in-new" size="12"/>
                  </a>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="自定义标签">
                <template #text>
                  <v-switch v-model="form.customTagsEnable" color="primary" hide-details label="启用" class="mb-2"/>
                  <StringListField v-model="form.customTags" :disabled="!form.customTagsEnable" label="标签"/>
                </template>
              </v-expansion-panel>

              <v-expansion-panel title="优先保留">
                <template #text>
                  <v-switch v-model="form.customPriorityKeywordsEnable" color="primary" hide-details label="启用"
                            class="mb-2"/>
                  <StringListField v-model="form.customPriorityKeywords"
                                   :disabled="!form.customPriorityKeywordsEnable" label="关键词"/>
                </template>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-tabs-window-item>

          <!-- ══ 其它 ══ -->
          <v-tabs-window-item value="other">
            <v-list class="py-0" density="comfortable">
              <v-list-item title="遗漏检测" subtitle="补齐历史缺集">
                <template #append>
                  <v-switch v-model="form.omit" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="自动上传" subtitle="下载完成后上传到网盘">
                <template #append>
                  <v-switch v-model="form.upload" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="只下载最新集">
                <template #append>
                  <v-switch v-model="form.downloadNew" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="摸鱼检测" subtitle="字幕组长期不更新时提醒">
                <template #append>
                  <v-switch v-model="form.procrastinating" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="通知">
                <template #append>
                  <v-switch v-model="form.message" color="primary" hide-details/>
                </template>
              </v-list-item>
              <v-list-item title="完结迁移" subtitle="完结后移动到归档目录">
                <template #append>
                  <v-switch v-model="form.completed" color="primary" hide-details/>
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-divider/>

      <v-card-actions class="flex-wrap">
        <!-- 「其他」和「预览」只对已存在的订阅有意义：新建的还没入库，
             刷新和刮削都没有对象可作用 -->
        <template v-if="!isNew">
          <v-menu location="top start">
            <template #activator="{props: p}">
              <v-btn v-bind="p" append-icon="mdi-menu-up" variant="text">其他</v-btn>
            </template>
            <v-list density="comfortable" min-width="240">
              <v-list-item v-for="m in MORE" :key="m.key" :prepend-icon="m.icon" :subtitle="m.subtitle"
                           :title="m.title" @click="runMore(m.key)"/>
            </v-list>
          </v-menu>
          <v-btn prepend-icon="mdi-eye-outline" variant="text" @click="previewing = true">预览</v-btn>
        </template>

        <!-- 移动文件是不可逆的，放在保存旁边并默认关闭，避免顺手点了 -->
        <v-checkbox v-if="!isNew" v-model="move" density="compact" hide-details label="同时移动已下载的文件"/>
        <v-spacer/>
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn :loading="saving" color="primary" variant="flat" @click="save">{{ isNew ? '添加' : '保存' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 带着这条订阅去番剧站换字幕组：定位到这部番，不用重新搜 -->
  <SourceBrowserDialog v-model="browsing" :preset="form" :source="browseSource" @pick="onPicked"/>

  <!-- 预览：改完匹配规则先看命中了什么再保存，比存完再回来看少一趟 -->
  <PreviewDialog v-if="previewing" :item="form" defer-save @close="previewing = false"/>

  <!-- 按 TmdbId 反查：番名被改过、或同名番太多时，按标题搜是搜不准的 -->
  <v-dialog v-model="askTmdbId" max-width="380">
    <v-card>
      <v-card-title class="pt-4">按 TmdbId 获取</v-card-title>
      <v-card-text>
        <v-text-field v-model="tmdbIdInput" autofocus hide-details label="TmdbId" placeholder="例如 1429"
                      @keyup.enter="applyTmdbId"/>
        <div class="text-caption text-medium-emphasis mt-3">
          在 themoviedb.org 打开条目，地址里 /tv/ 或 /movie/ 后面那串数字就是。
        </div>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-spacer/>
        <v-btn variant="text" @click="askTmdbId = false">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="applyTmdbId">获取</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 剧集组列表：每条带「按什么分的 / 几组 / 几集」，挑错组整季集数就会错位 -->
  <v-dialog v-model="groupOpen" max-width="480" scrollable>
    <v-card>
      <v-card-title class="pt-4">选择剧集组</v-card-title>
      <v-card-subtitle class="pb-4">TMDB #{{ tmdbId }}</v-card-subtitle>
      <v-divider/>
      <v-card-text style="max-height: 60vh">
        <div v-if="busy === 'group'" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate/>
        </div>
        <v-empty-state v-else-if="!groups.length" icon="mdi-format-list-numbered"
                       text="这个条目只有默认的播出顺序" title="没有剧集组"/>
        <div v-else class="d-flex flex-column ga-3">
          <div v-for="g in groups" :key="g.id" :class="{picked: g.id === tmdbGroupId}" class="grp"
               @click="pickGroup(g)">
            <div class="d-flex align-center ga-2">
              <a :href="`https://www.themoviedb.org/tv/${tmdbId}/episode_group/${g.id}`" class="grp-name"
                 rel="noopener" target="_blank" @click.stop>{{ g.name }}</a>
              <v-spacer/>
              <v-chip v-if="g.id === tmdbGroupId" color="primary" size="x-small" variant="flat">已选择</v-chip>
            </div>
            <div class="d-flex flex-wrap ga-2 mt-2">
              <v-chip color="success" size="x-small" variant="tonal">{{ g.typeName }}</v-chip>
              <v-chip size="x-small" variant="tonal">{{ g.groupCount }} 组</v-chip>
              <v-chip size="x-small" variant="tonal">{{ g.episodeCount }} 集</v-chip>
            </div>
          </div>
        </div>
      </v-card-text>
      <v-divider/>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="tmdbGroupId = ''; groupOpen = false">用默认顺序</v-btn>
        <v-spacer/>
        <v-btn variant="text" @click="groupOpen = false">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* TMDB 名右边那颗外链图标：贴在输入框内侧，不占 append 的位置 */
.tmdb-link {
    display: inline-flex;
    align-items: center;
    color: rgb(var(--v-theme-primary));
}

.doc-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-top: 6px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.doc-link:hover {
    text-decoration: underline;
}

.grp {
    padding: 12px 14px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 12px;
    cursor: pointer;
    transition: border-color .18s, background-color .18s;
}

.grp:hover {
    border-color: rgba(var(--v-theme-primary), .5);
    background: rgba(var(--v-theme-primary), .05);
}

.grp.picked {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), .08);
}

.grp-name {
    font-size: 14px;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.grp-name:hover {
    text-decoration: underline;
}
</style>
