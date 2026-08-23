<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'

/**
 * 「关于本机」那扇窗。
 *
 * System 7 的 About This Macintosh 是一页：左上角一个图标 + 版本号，右边一条条横杠
 * 表示每个程序占了多少内存。四个统计数字放进这个形状里正合适 ——
 * 横杠比数字更能一眼看出「启用了多少 / 停了多少」。
 *
 * 下面两块是 Finder 的列表视图：一行一条，左边一个小图标，右边靠右对齐的次要信息。
 * 没有卡片、没有阴影、没有圆角 —— 那个年代的「分组」就是一条横线加一个小标题。
 */
const d = useDashboard()
const router = useRouter()

/*
 * 横杠的刻度。
 *
 * 四条杠必须共用一个刻度，否则「3 个下载任务」和「22 条订阅」会画得一样长，
 * 那就不是计量条而是四条装饰。取四个数里最大的那个当满格，最小给 1 防止除零。
 */
const scale = computed(() => Math.max(1, ...d.stats.value.map(s => Number(s.value) || 0)))
</script>

<template>
  <div class="mac-page">
    <!-- ── 抬头 ── -->
    <div class="about">
      <v-icon class="about-icon" icon="mdi-rss-box" size="42"/>
      <div class="min0">
        <div class="about-name">ani-rss</div>
        <div class="about-line">
          {{ d.todayLabel.value || '今天' }}有 {{ d.today.value.length }} 部要更新
        </div>
      </div>
    </div>

    <div class="rule"/>

    <!-- ── 横杠计量 ── -->
    <div class="meters">
      <button v-for="st in d.stats.value" :key="st.key" class="meter" type="button" @click="router.push(st.to)">
        <span class="meter-label">{{ st.label }}</span>
        <span class="meter-track">
          <span :style="{width: `${(Number(st.value) || 0) / scale * 100}%`}" class="meter-fill"/>
        </span>
        <span class="meter-num">{{ st.value }}</span>
      </button>
    </div>

    <div class="rule"/>

    <!-- ── 今天更新 ── Finder 的列表视图 -->
    <h2 class="sec">今天更新</h2>
    <div v-if="d.today.value.length" class="list">
      <button v-for="a in d.today.value" :key="a.id" class="row" type="button"
              @click="router.push('/subscriptions')">
        <v-icon class="row-icon" icon="mdi-file-outline" size="14"/>
        <span class="row-name">{{ a.title }}</span>
        <span class="row-info">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
      </button>
    </div>
    <p v-else class="hint">今天没有番要更新。</p>

    <div class="rule"/>

    <h2 class="sec">下载中</h2>
    <div v-if="d.torrents.downloading.length" class="list">
      <div v-for="t in d.torrents.downloading.slice(0, 6)" :key="t.hash" class="row row-static">
        <v-icon class="row-icon" icon="mdi-arrow-down-bold-box-outline" size="14"/>
        <span class="row-name">{{ t.name }}</span>
        <span class="meter-track meter-track-sm">
          <span :style="{width: `${t.progress}%`}" class="meter-fill"/>
        </span>
        <span class="row-info">{{ formatPercent(t.progress) }}</span>
      </div>
    </div>
    <p v-else class="hint">{{ d.downloadsHint.value }}</p>

    <div class="rule"/>

    <h2 class="sec">疑似停更<span v-if="d.stalled.value.length"> （{{ d.stalled.value.length }}）</span></h2>
    <div v-if="d.stalled.value.length" class="list">
      <div v-for="a in d.stalled.value.slice(0, 6)" :key="a.id" class="row row-static">
        <v-icon class="row-icon" icon="mdi-alert-outline" size="14"/>
        <span class="row-name">{{ a.title }}</span>
        <span class="row-info">最后更新 {{ fromNow(a.lastDownloadTime) }}</span>
      </div>
    </div>
    <p v-else class="hint">字幕组都很勤快。</p>
  </div>
</template>

<style scoped>
.mac-page {
    padding: 14px 16px 24px;
}

.min0 {
    min-width: 0;
}

/* ── 抬头 ── */
.about {
    display: flex;
    align-items: center;
    gap: 14px;
}

.about-icon {
    flex: 0 0 auto;
}

.about-name {
    font-size: 24px;
    line-height: 28px;
    /* 点阵字没有粗体，加粗的做法是错开一像素再描一遍（皮肤里也是这么干的） */
    text-shadow: 1px 0 0 currentColor;
}

.about-line {
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 那个年代的分组线：一条黑线，上下各留一点气 */
.rule {
    height: 1px;
    margin: 14px 0;
    background: var(--mac-ink);
}

/* ── 横杠计量 ── */
.meters {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.meter {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 24px;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .meter {
        min-height: 36px;
    }
}

.meter-label {
    flex: 0 0 84px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meter-track {
    flex: 1 1 auto;
    min-width: 0;
    height: 12px;
    background: var(--mac-paper);
    box-shadow: var(--mac-edge);
}

.meter-track-sm {
    flex: 0 0 74px;
    height: 10px;
}

/*
 * 填充是黑白斜纹，不是一整条黑 —— 当年的计量条就是这种 45 度阴影线。
 * 用背景画而不是遮罩：这里的颜色是自己定的（纯黑），不像 Vuetify 的进度条
 * 会被 .bg-success 之类的类连着 color 一起改掉。
 */
.meter-fill {
    display: block;
    height: 100%;
    background: repeating-linear-gradient(45deg,
    var(--mac-ink) 0 3px, var(--mac-paper) 3px 6px);
}

.meter-num {
    flex: 0 0 auto;
    min-width: 34px;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

/* ── 小标题与列表 ── */
.sec {
    margin-bottom: 8px;
    font-size: 12px;
    line-height: 16px;
    text-shadow: 1px 0 0 currentColor;
}

.list {
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 24px;
    padding: 2px 4px;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .row {
        min-height: 36px;
    }
}

/* 选中就是整行反白 —— Finder 里点一行就是这个样子 */
.row:hover,
.row:focus-visible {
    background: var(--mac-ink);
    color: var(--mac-paper);
    outline: none;
}

/* 不能点的行（下载进度、停更列表）别给悬停反白，那会假装它能点 */
.row-static {
    cursor: default;
}

.row-static:hover {
    background: none;
    color: inherit;
}

.row-icon {
    flex: 0 0 auto;
}

.row-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-info {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}

.hint {
    padding: 2px 4px;
}
</style>
