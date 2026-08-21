<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Ani} from '@shared/types'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import {aniActions} from '@/components/ani/aniActions'
import AniPosterCard from '@/components/ani/AniPosterCard.vue'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'
import AniFilterBar from '@/components/ani/AniFilterBar.vue'

/**
 * 订阅页 = 资源管理器的「详细信息」视图。
 *
 * 别款给的多半是海报墙或者卡片流 —— 好看，但一屏只看得见十来条，
 * 而且「哪些停用了」「哪些好几周没更新」得一张张看过去。
 * 详细信息视图是另一个路子：一行一条、列对齐、点表头排序，
 * 一屏三十行，扫一眼就知道哪一列不对劲。这正是 Win98 最擅长的事。
 *
 * 「大图标」那个视图也留着（工具栏上切换），要看封面的时候用。
 */
const s = useAniScreen()

/** 当前行。Explorer 里单击是「选中」、双击才是「打开」，这里也一样 */
const cur = ref('')

/* ── 排序：点表头切换升降序，再点一次反向。详细信息视图的核心能力 ── */
type Key = 'title' | 'subgroup' | 'episodes' | 'enable' | 'time'
const sortKey = ref<Key | ''>('')
const asc = ref(true)

function sortBy(k: Key) {
  if (sortKey.value === k) asc.value = !asc.value
  else {
    sortKey.value = k
    asc.value = true
  }
}

const COLS = [
  {key: 'title' as const, title: '名称', cls: ''},
  {key: 'subgroup' as const, title: '字幕组', cls: 'col-sub'},
  {key: 'episodes' as const, title: '进度', cls: 'col-ep'},
  {key: 'enable' as const, title: '状态', cls: 'col-on'},
  {key: 'time' as const, title: '最后更新', cls: 'col-time'},
]

/** 排序键 → 可比较的值。中文按 localeCompare，不然「一」会排在「Z」后面 */
const valueOf = (a: Ani, k: Key): string | number => ({
  title: a.title || '',
  subgroup: a.subgroup || '',
  episodes: a.currentEpisodeNumber ?? -1,
  enable: a.enable ? 1 : 0,
  time: a.lastDownloadTime ?? 0,
}[k])

const rows = computed(() => {
  const list = [...s.ani.filtered]
  const k = sortKey.value
  if (!k) return list
  const dir = asc.value ? 1 : -1
  return list.sort((x, y) => {
    const [vx, vy] = [valueOf(x, k), valueOf(y, k)]
    if (typeof vx === 'string' && typeof vy === 'string') return vx.localeCompare(vy, 'zh') * dir
    return ((vx as number) - (vy as number)) * dir
  })
})

/* ── 右键菜单 ──
   动作清单来自 aniActions，和别款是同一份 —— 换个皮肤少几个能力那种事不能再有。
   触屏没有右键，所以每行末尾还有一颗「▼」，点它开的是同一个菜单。 */
const ctxOpen = ref(false)
const ctxAt = ref<[number, number]>([0, 0])
const ctxItem = ref<Ani | null>(null)
const ctxActions = computed(() => (ctxItem.value ? aniActions(s, ctxItem.value) : []))

/** 这一行是不是正开着菜单 */
const isOpen = (a: Ani) => ctxOpen.value && ctxItem.value?.id === a.id

function openMenu(e: MouseEvent, a: Ani) {
  ctxItem.value = a
  ctxAt.value = [e.clientX, e.clientY]
  ctxOpen.value = true
}

/** 菜单项是 <li>，键盘要能用：回车转成一次 click，动作还是 @click 那一份 */
const enterClick = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.click()

function pick(a: Ani) {
  cur.value = a.id || ''
  if (s.selectMode.value) s.on.toggle(a)
}
</script>

<template>
  <div class="w98-page">
    <!-- ── 工具栏 ── -->
    <div class="w98-toolbar">
      <v-btn prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" @click="s.ani.refreshAll()">刷新</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" @click="s.importing.value = true">导入</v-btn>
      <v-btn prepend-icon="mdi-package-variant-closed" @click="s.collecting.value = true">合集</v-btn>
      <v-btn :prepend-icon="s.prefs.viewMode === 'list' ? 'mdi-view-grid-outline' : 'mdi-view-list-outline'"
             @click="s.prefs.viewMode = s.prefs.viewMode === 'list' ? 'grid' : 'list'">
        {{ s.prefs.viewMode === 'list' ? '大图标' : '详细信息' }}
      </v-btn>
      <v-btn :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             @click="s.toggleSelectMode()">
        {{ s.selectMode.value ? '退出多选' : '多选' }}
      </v-btn>
      <AniFilterBar/>
    </div>

    <AniBatchBar :s="s" rounded="0"/>

    <div v-if="s.ani.loading && !s.ani.all.length" class="w98-well pa-2">
      <AniSkeleton :count="10" shape="row"/>
    </div>

    <template v-else>
      <v-empty-state
          v-if="!s.ani.filtered.length"
          :text="s.ani.filtering ? '换个关键词或放宽筛选条件试试，搜索支持拼音和首字母' : '还没有订阅，点工具栏上的「添加订阅」'"
          :title="s.ani.filtering ? '没有匹配的订阅' : '这个文件夹是空的'"
          icon="mdi-television-off"
      />

      <!-- ══ 详细信息 ══ -->
      <div v-else-if="s.prefs.viewMode === 'list'" class="lv w98-well">
        <table>
          <thead>
          <tr>
            <th v-for="c in COLS" :key="c.key" :class="c.cls">
              <button class="lv-th" type="button" @click="sortBy(c.key)">
                <span>{{ c.title }}</span>
                <i v-if="sortKey === c.key">{{ asc ? '▲' : '▼' }}</i>
              </button>
            </th>
            <th class="col-act"/>
          </tr>
          </thead>
          <tbody>
          <tr v-for="a in rows" :key="a.id"
              :class="{on: (s.selectMode.value && !!a.id && s.ani.selected.has(a.id)) || (!s.selectMode.value && cur === a.id)}"
              @click="pick(a)" @contextmenu.prevent="openMenu($event, a)" @dblclick="s.on.edit(a)">
            <td>
              <div class="lv-name">
                <v-icon :icon="a.enable ? 'mdi-television-classic' : 'mdi-television-off'" size="15"/>
                <span class="lv-text">{{ a.title }}</span>
              </div>
            </td>
            <td class="col-sub">
              <span class="lv-text">{{ a.subgroup || '未知字幕组' }}</span>
            </td>
            <td class="col-ep">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</td>
            <td class="col-on">{{ a.enable ? '启用' : '停用' }}</td>
            <td class="col-time">{{ fromNow(a.lastDownloadTime) }}</td>
            <td class="col-act">
              <!-- 开着的时候翻成 ▲：这一排全长一个样，不标状态就看不出菜单是哪一行召出来的 -->
              <button :title="isOpen(a) ? '收起' : '展开操作'" class="lv-more" type="button"
                      @click.stop="openMenu($event, a)">{{ isOpen(a) ? '▲' : '▼' }}
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- ══ 大图标 ══ 分组按星期，和别款一致 -->
      <template v-else>
        <div v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])" :key="w.label"
             class="w98-group">
          <div v-if="w.label" class="w98-grouphead">{{ w.label }}（{{ w.items.length }}）</div>
          <div class="w98-icons">
            <AniPosterCard v-for="a in w.items" :key="a.id" :item="a" :s="s" :select-mode="s.selectMode.value"
                           :selected="!!a.id && s.ani.selected.has(a.id)"/>
          </div>
        </div>
      </template>
    </template>

    <!-- 右键 / ▼ 菜单。target 收的是一对坐标，Vuetify 直接支持 -->
    <v-menu v-model="ctxOpen" :target="ctxAt" :transition="false" location="bottom end">
      <ul class="w98-ctx" role="menu" @keydown.enter.prevent="enterClick">
        <li v-for="act in ctxActions" :key="act.key" :class="{danger: act.danger}" role="menuitem"
            tabindex="0" @click="act.run()">
          <v-icon :icon="act.icon" size="14"/>
          {{ act.title }}
        </li>
      </ul>
    </v-menu>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.w98-page {
    padding: 8px;
}

.w98-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

/* 内容装在一口「井」里：Win98 的列表、文本框、画布都是这么陷下去的 */
.w98-well {
    background: #fff;
    box-shadow: var(--w98-well);
}

/* ── 详细信息 ── */
.lv {
    /* 兜底：列全部收起来之后仍然放不下（超长的字幕组名）时，横滚发生在这一块里，
       不是整页跟着晃 */
    overflow-x: auto;
}

.lv table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.lv thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 0;
    background: var(--w98-face);
}

/* 表头是一排凸起的按钮 —— 点下去排序，这是 Explorer 的原样 */
.lv-th {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    height: 20px;
    padding: 0 5px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    color: var(--w98-ink);
    font: inherit;
    text-align: left;
    /* 除「名称」外每列都是 width: 1%（缩到内容宽），排序箭头一冒出来就会把
       「进度」「最后更新」挤成两行。表头不折行 */
    white-space: nowrap;
}

.lv-th:active {
    box-shadow: var(--w98-in);
}

.lv-th i {
    margin-left: auto;
    font-size: 12px;
    font-style: normal;
}

.lv tbody tr {
    cursor: default;
}

.lv tbody td {
    padding: 3px 5px;
    white-space: nowrap;
}

/* 选中整行反白 —— 不是加个浅底色，Win98 的选中就是靛蓝铺满 */
.lv tbody tr.on td {
    background: var(--w98-title-a);
    color: #fff;
}

.lv-name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.lv-text {
    display: block;
    overflow: hidden;
    max-width: 30ch;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.col-sub,
.col-ep,
.col-on {
    /* 除了「名称」，其余列一律缩到内容宽度 —— 资源管理器里也是名称吃掉剩下的所有宽度 */
    width: 1%;
}

.col-time {
    width: 1%;
    text-align: right;
}

.col-act {
    width: 24px;
}

.lv-more {
    width: 18px;
    height: 18px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    color: var(--w98-ink);
    font-size: 12px;
    line-height: 1;
}

.lv-more:active {
    box-shadow: var(--w98-in);
}

/*
 * 窄屏收列，而不是让表格横着滚。
 *
 * 五列在 390px 上一定放不下，横滚的表格在手机上极难用 ——
 * 手指往右一划就把整行推走，再想回来得反着划。
 * 留「名称 + 进度 + ▼」三列，字幕组和更新时间进右键菜单里的「编辑」去看。
 */
@media (max-width: 599.98px), (pointer: coarse) {
    .col-sub,
    .col-on,
    .col-time {
        display: none;
    }

    .lv table {
        font-size: 12px;
    }

    .lv tbody td {
        padding: 8px 6px;
    }

    /* 36px 是这个项目的触摸下限（见 styles/touch.css），表头和 ▼ 都得够到 */
    .lv-th {
        height: 36px;
    }

    .lv-more {
        width: 36px;
        height: 36px;
        font-size: 12px;
    }

    .col-act {
        width: 42px;
    }

    .lv-text {
        max-width: 46vw;
    }
}

/* ── 大图标 ── */
.w98-group + .w98-group {
    margin-top: 14px;
}

.w98-grouphead {
    margin-bottom: 6px;
    padding: 2px 4px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    font-weight: 700;
}

.w98-icons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 10px;
}

@media (min-width: 960px) {
    .w98-icons {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
}

/* ── 右键菜单 ── */
.w98-ctx {
    min-width: 160px;
    margin: 0;
    padding: 2px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    color: var(--w98-ink);
    font-size: 12px;
    list-style: none;
}

.w98-ctx li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 20px;
    padding: 2px 18px 2px 6px;
    cursor: default;
}

.w98-ctx li:hover {
    background: var(--w98-title-a);
    color: #fff;
}

.w98-ctx li.danger {
    color: #800000;
}

.w98-ctx li.danger:hover {
    color: #fff;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-ctx {
        font-size: 12px;
    }

    .w98-ctx li {
        min-height: 36px;
        padding: 6px 18px 6px 10px;
    }
}
</style>
