<script setup lang="ts">
import {useRouter} from 'vue-router'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {toApiFile} from '@shared/http'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * Primer 的总览：左边一条「今天更新」的时间线，右边一列窄边栏。
 *
 * 这一款原来是没有总览页的（meta.dashboard = false，打开直接进清单）。
 * 想法没错 —— 但结果是所有界面里只有这一款少一整页，
 * 「今天有几部要更新」「谁在下」「谁停更了」这三件事只有这一款看不到。
 * github.com 自己的首页也是「feed + 右边栏」，补上并不违和。
 *
 * 视觉上守 Primer 的两条规矩：容器是描边的方盒子不是阴影卡；
 * 数字是「标签 + 计数」这种小圆点，不是大号 KPI 数字 —— 那是仪表盘的语言，不是 Primer 的。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')
</script>

<template>
  <div class="pa-4">
    <!-- 计数条：Primer 里这类信息是一排带计数的小标签，不是四张大卡 -->
    <div class="counters">
      <button v-for="s in d.stats.value" :key="s.key" class="counter" type="button" @click="router.push(s.to)">
        <v-icon :icon="s.icon" size="14"/>
        <span class="counter-label">{{ s.label }}</span>
        <span class="counter-num">{{ s.value }}</span>
      </button>
    </div>

    <div class="cols">
      <!-- ── 主栏：今天更新 ── -->
      <section class="box">
        <div class="box-head">
          <span>今天更新</span>
          <span class="grow"/>
          <span class="muted">{{ d.todayLabel.value }}</span>
          <button class="link" type="button" @click="d.ani.refreshAll()">刷新全部</button>
        </div>

        <div v-if="d.firstLoad.value" class="pa-3">
          <AniSkeleton :count="4" shape="row"/>
        </div>

        <template v-else-if="d.today.value.length">
          <div v-for="a in d.today.value" :key="a.id" class="row" @click="router.push('/subscriptions')">
            <img v-if="a.cover" :alt="a.title" :src="cover(a.cover)" class="thumb"/>
            <div v-else class="thumb thumb-ph"><v-icon icon="mdi-television-classic" size="16"/></div>
            <div class="row-main">
              <div class="row-title">{{ a.title }}</div>
              <div class="row-sub">
                <span>{{ a.subgroup || '未知字幕组' }}</span>
                <span class="dot">·</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
              </div>
            </div>
            <span v-if="!a.enable" class="pill">停用</span>
          </div>
        </template>

        <p v-else class="empty">今天没有番要更新。</p>
      </section>

      <!-- ── 边栏 ── -->
      <aside class="side">
        <section class="box">
          <div class="box-head">
            <span>下载中</span>
            <span class="grow"/>
            <button class="link" type="button" @click="router.push('/downloads')">全部</button>
          </div>
          <template v-if="d.torrents.downloading.length">
            <div v-for="t in d.torrents.downloading.slice(0, 5)" :key="t.hash" class="row row-tight">
              <div class="row-main">
                <div class="row-title small">{{ t.name }}</div>
                <div class="bar">
                  <div :style="{width: formatPercent(t.progress)}" class="bar-fill"/>
                </div>
              </div>
              <span class="num">{{ formatPercent(t.progress) }}</span>
            </div>
          </template>
          <p v-else class="empty">{{ d.downloadsHint.value }}</p>
        </section>

        <section class="box">
          <div class="box-head">
            <span>疑似停更</span>
            <span class="grow"/>
            <span v-if="d.stalled.value.length" class="count-badge">{{ d.stalled.value.length }}</span>
          </div>
          <template v-if="d.stalled.value.length">
            <div v-for="a in d.stalled.value.slice(0, 5)" :key="a.id" class="row row-tight">
              <div class="row-main">
                <div class="row-title small">{{ a.title }}</div>
                <div class="row-sub">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
              </div>
            </div>
          </template>
          <p v-else class="empty">字幕组都很勤快。</p>
        </section>

        <section class="box">
          <div class="box-head"><span>最近下载</span></div>
          <template v-if="d.recent.value.length">
            <div v-for="a in d.recent.value.slice(0, 5)" :key="a.id" class="row row-tight">
              <div class="row-main">
                <div class="row-title small">{{ a.title }}</div>
                <div class="row-sub">{{ fromNow(a.lastDownloadTime) }}</div>
              </div>
            </div>
          </template>
          <p v-else class="empty">还没有下载记录。</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ── 计数条 ── */
.counters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
}

/* Primer 的 counter：一颗描边药丸，左边图标和文字、右边一个灰底数字 */
.counter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid rgba(128, 128, 128, .4);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-size: .8125rem;
    cursor: pointer;
    transition: background-color var(--m-dur) var(--m-ease), border-color var(--m-dur) var(--m-ease);
}

.counter:hover {
    background: rgba(var(--v-theme-on-surface), .06);
    border-color: rgba(128, 128, 128, .6);
}

.counter-label {
    opacity: .8;
}

.counter-num {
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(var(--v-theme-on-surface), .1);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
}

/* ── 两栏。边栏 296px 是 Primer 自己的宽度；窄屏直接叠成一列 ── */
.cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

@media (min-width: 1012px) {
    .cols {
        grid-template-columns: minmax(0, 1fr) 296px;
    }
}

.side {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

/* ── Primer 的 Box：方盒子 + 描边，没有阴影 ── */
.box {
    border: 1px solid rgba(128, 128, 128, .28);
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--v-theme-surface));
}

.box-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: .875rem;
    font-weight: 600;
    background: rgba(var(--v-theme-on-surface), .05);
    border-bottom: 1px solid rgba(128, 128, 128, .28);
}

.grow {
    flex: 1 1 auto;
}

.muted {
    font-weight: 400;
    font-size: .75rem;
    opacity: .7;
}

.link {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    font-weight: 400;
    font-size: .75rem;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;
}

.link:hover {
    text-decoration: underline;
}

.count-badge {
    padding: 0 7px;
    border-radius: 999px;
    background: rgba(var(--v-theme-warning), .2);
    color: rgb(var(--v-theme-warning));
    font-size: .69rem;
    line-height: 1.7;
}

/* ── 行 ── */
.row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
    cursor: pointer;
    transition: background-color var(--m-dur) var(--m-ease);
}

.row-tight {
    padding: 10px 16px;
    cursor: default;
}

.row:last-child {
    border-bottom: none;
}

.row:hover {
    background: rgba(var(--v-theme-on-surface), .04);
}

.thumb {
    flex: 0 0 auto;
    width: 36px;
    height: 50px;
    border-radius: 4px;
    object-fit: cover;
    background: rgba(var(--v-theme-on-surface), .06);
}

.thumb-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: .5;
}

.row-main {
    flex: 1 1 auto;
    min-width: 0;
}

.row-title {
    font-size: .9375rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-title.small {
    font-size: .8125rem;
    font-weight: 500;
}

.row-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: .75rem;
    opacity: .72;
}

.dot {
    opacity: .5;
}

/* 进度条自己画：v-progress-linear 会带上 Vuetify 的圆角和过渡，
   和这一款「方角描边」的调子不搭 */
.bar {
    height: 6px;
    margin-top: 6px;
    border-radius: 3px;
    background: rgba(var(--v-theme-on-surface), .12);
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    background: rgb(var(--v-theme-primary));
    transition: width var(--m-dur) var(--m-ease);
}

.num {
    flex: 0 0 auto;
    font-size: .75rem;
    font-variant-numeric: tabular-nums;
    opacity: .8;
}

.pill {
    flex: 0 0 auto;
    padding: 0 7px;
    border-radius: 999px;
    font-size: .69rem;
    line-height: 1.7;
    border: 1px solid rgba(128, 128, 128, .4);
    opacity: .8;
}

.empty {
    padding: 20px 16px;
    font-size: .8125rem;
    opacity: .65;
}

/*
 * 这两个是本预设自己画的控件，不走 v-btn —— touch.css 那份下限管不到它们。
 * 实测 .counter 高 32px、.link 高 18px，手机上都够不着。
 *
 * 这一块必须摆在 .counter / .link 的基础规则之后：两边权重相同，
 * 靠先后决胜。摆在前面的话，下面那条 .link { padding: 0 } 会把热区又抹平。
 */
@media (max-width: 599.98px), (pointer: coarse) {
    .counter {
        min-height: 40px;
        padding: 8px 12px;
    }

    .link {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        /* 「全部」只有 24px 宽，同样左右各撑 6px 热区再用负外边距抵回去 */
        padding-inline: 6px;
        margin-inline: -6px;
    }
}
</style>
