<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import * as api from '@shared/api'
import type {TmdbGroup} from '@shared/api'
import {useUiStore} from '@/stores/ui'
import StringListField from '@/components/common/StringListField.vue'

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

async function showDownloadPath() {
  busy.value = 'path'
  try {
    const r = await api.downloadPath(form.value)
    ui.info(`下载位置：${Object.values(r).join(' / ')}`)
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
                      取 Bgm 标题
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field v-model="form.themoviedbName" label="TMDB">
                  <template #append>
                    <v-btn :loading="busy === 'tmdb'" size="small" variant="tonal" @click="pickTmdbName">
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
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.season" label="季" type="number"/>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="form.offset" label="集数偏移" type="number"/>
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
                  <v-btn :loading="busy === 'path'" class="mt-3" size="small" variant="tonal" @click="showDownloadPath">
                    预览实际下载位置
                  </v-btn>
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
                                label="模版"/>
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
        <!-- 移动文件是不可逆的，放在保存旁边并默认关闭，避免顺手点了 -->
        <v-checkbox v-if="!isNew" v-model="move" density="compact" hide-details label="同时移动已下载的文件"/>
        <v-spacer/>
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn :loading="saving" color="primary" variant="flat" @click="save">{{ isNew ? '添加' : '保存' }}</v-btn>
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
