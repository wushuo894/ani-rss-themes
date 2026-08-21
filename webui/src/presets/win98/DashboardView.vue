<script setup lang="ts">
import {useRouter} from 'vue-router'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {toApiFile} from '@shared/http'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * 总览 = 一页「系统属性」。
 *
 * Win98 里凡是「一屏看完一堆状态」的地方，长的都是这个样子：
 * 若干个刻着标题的分组框（group box），框里是标签—数值对，或者一口下沉的白列表。
 * 没有大号数字卡，没有阴影 —— 那是仪表盘的语言，不是这个年代的。
 *
 * 分组框用 fieldset/legend 而不是 div + 绝对定位的标题：
 * 缺口正好卡在标题两侧这件事浏览器自己会做，手写要算三段边框。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')
</script>

<template>
  <div class="w98-page">
    <div class="two-col">
      <div class="col">
        <!-- ── 今天更新 ── -->
        <fieldset class="gbox">
          <legend>今天更新（{{ d.todayLabel.value || '—' }}）</legend>

          <div v-if="d.firstLoad.value" class="well pa-2">
            <AniSkeleton :count="4" shape="row"/>
          </div>

          <div v-else-if="d.today.value.length" class="well list">
            <div v-for="a in d.today.value" :key="a.id" class="row" @click="router.push('/subscriptions')">
              <img v-if="a.cover" :alt="a.title" :src="cover(a.cover)" class="thumb"/>
              <div v-else class="thumb thumb-ph">
                <v-icon icon="mdi-television-classic" size="14"/>
              </div>
              <div class="row-main">
                <div class="row-title">{{ a.title }}</div>
                <div class="row-sub">
                  {{ a.subgroup || '未知字幕组' }} · {{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}
                </div>
              </div>
              <span v-if="!a.enable" class="tag">停用</span>
            </div>
          </div>

          <p v-else class="empty">今天没有番要更新。</p>

          <div class="gbox-actions">
            <v-btn prepend-icon="mdi-refresh" @click="d.ani.refreshAll()">全部刷新</v-btn>
            <v-btn prepend-icon="mdi-television-play" @click="router.push('/subscriptions')">打开订阅</v-btn>
          </div>
        </fieldset>

        <!-- ── 最近下载 ── -->
        <fieldset class="gbox">
          <legend>最近下载</legend>
          <div v-if="d.recent.value.length" class="well list">
            <div v-for="a in d.recent.value.slice(0, 6)" :key="a.id" class="row row-tight">
              <v-icon icon="mdi-file-download-outline" size="14"/>
              <div class="row-main">
                <div class="row-title">{{ a.title }}</div>
              </div>
              <span class="row-time">{{ fromNow(a.lastDownloadTime) }}</span>
            </div>
          </div>
          <p v-else class="empty">还没有下载记录。</p>
        </fieldset>
      </div>

      <div class="col">
        <!-- ── 统计 ── 标签在左、数值在右，Win98「系统属性」那一页的排法 -->
        <fieldset class="gbox">
          <legend>系统</legend>
          <dl class="props">
            <template v-for="s in d.stats.value" :key="s.key">
              <dt>
                <v-icon :icon="s.icon" size="14"/>
                {{ s.label }}：
              </dt>
              <dd>
                <button class="linkish" type="button" @click="router.push(s.to)">{{ s.value }}</button>
              </dd>
            </template>
          </dl>
        </fieldset>

        <!-- ── 下载中 ── 进度条是那种一格一格的蓝方块 -->
        <fieldset class="gbox">
          <legend>下载中</legend>
          <template v-if="d.torrents.downloading.length">
            <div v-for="t in d.torrents.downloading.slice(0, 5)" :key="t.hash" class="task">
              <div class="row-title">{{ t.name }}</div>
              <div class="task-line">
                <div class="pbar">
                  <div :style="{width: formatPercent(t.progress)}" class="pfill"/>
                </div>
                <span class="pnum">{{ formatPercent(t.progress) }}</span>
              </div>
            </div>
          </template>
          <p v-else class="empty">{{ d.downloadsHint.value }}</p>
          <div class="gbox-actions">
            <v-btn prepend-icon="mdi-download-outline" @click="router.push('/downloads')">打开下载器</v-btn>
          </div>
        </fieldset>

        <!-- ── 疑似停更 ── -->
        <fieldset class="gbox">
          <legend>疑似停更（{{ d.stalled.value.length }}）</legend>
          <div v-if="d.stalled.value.length" class="well list">
            <div v-for="a in d.stalled.value.slice(0, 6)" :key="a.id" class="row row-tight">
              <v-icon icon="mdi-alert-outline" size="14"/>
              <div class="row-main">
                <div class="row-title">{{ a.title }}</div>
                <div class="row-sub">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
              </div>
            </div>
          </div>
          <p v-else class="empty">字幕组都很勤快。</p>
        </fieldset>
      </div>
    </div>
  </div>
</template>

<style scoped>
.w98-page {
    padding: 10px;
}

/*
 * 两栏。子项的最小尺寸必须写成 minmax(0, 1fr) 并给 min-width: 0 ——
 * 网格子项默认的最小宽度是 auto，里头有一行 nowrap 的长标题就能把整列顶宽，
 * 结果是整页能左右拖。这个坑五款各踩过一次，不再重踩。
 */
.two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}

@media (min-width: 900px) {
    .two-col {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

.col {
    min-width: 0;
}

/* ── 分组框 ── 一圈「刻进去」的细线：上/左暗、下/右亮 */
.gbox {
    min-width: 0;
    margin: 0 0 12px;
    padding: 8px 10px 10px;
    border: 1px solid;
    border-color: var(--w98-shade) var(--w98-hi) var(--w98-hi) var(--w98-shade);
}

.gbox:last-child {
    margin-bottom: 0;
}

.gbox > legend {
    padding: 0 4px;
    font-weight: 700;
}

.gbox-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

/* ── 下沉的白列表 ── */
.well {
    background: #fff;
    box-shadow: var(--w98-well);
}

.list {
    max-height: 280px;
    overflow-y: auto;
    padding: 2px;
}

.row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px;
    cursor: default;
}

.row:hover {
    background: var(--w98-title-a);
    color: #fff;
}

.row-tight {
    padding: 2px 4px;
}

.thumb {
    flex: 0 0 auto;
    width: 22px;
    height: 30px;
    object-fit: cover;
    background: var(--w98-light);
}

.thumb-ph {
    display: flex;
    align-items: center;
    justify-content: center;
}

.row-main {
    flex: 1 1 auto;
    min-width: 0;
}

.row-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    opacity: .8;
}

.row-time {
    flex: 0 0 auto;
    font-size: 11px;
    opacity: .8;
}

.tag {
    flex: 0 0 auto;
    padding: 0 4px;
    border: 1px solid var(--w98-shade);
    font-size: 11px;
}

.empty {
    margin: 0;
    padding: 10px 2px;
    opacity: .8;
}

/* ── 标签—数值对 ── */
.props {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 8px;
    margin: 0;
}

.props dt {
    display: flex;
    align-items: center;
    gap: 5px;
}

.props dd {
    margin: 0;
    font-weight: 700;
}

/*
 * 数值本身可以点进去。做成按钮而不是纯文字：
 * 「订阅总数 22」点一下就到订阅页，是这一页最常用的动作。
 */
.linkish {
    padding: 0 2px;
    background: none;
    color: var(--w98-title-a);
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
}

/* ── 进度条 ── 一格一格的蓝方块，1998 年的标志物之一 */
.task + .task {
    margin-top: 8px;
}

.task-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
}

.pbar {
    flex: 1 1 auto;
    min-width: 0;
    height: 16px;
    padding: 2px;
    background: #fff;
    box-shadow: var(--w98-well);
}

.pfill {
    height: 100%;
    /* 方块 8px、缝 2px。缝是透明的，透出来的就是底下那口白井 */
    background-image: repeating-linear-gradient(90deg,
    var(--w98-title-a) 0 8px, transparent 8px 10px);
}

.pnum {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .row {
        padding: 7px 5px;
    }

    .row-tight {
        padding: 6px 5px;
    }

    /* 文字数值在手机上也得点得着，撑出 36px 的热区再用负外边距抵回去 */
    .linkish {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        margin-inline: -6px;
        padding-inline: 6px;
    }
}
</style>
