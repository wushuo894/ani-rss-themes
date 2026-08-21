<script setup lang="ts">
import {useRouter} from 'vue-router'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * 文档站首页的排法：一段 hero 文案 + 两个行动按钮 + 一排 feature 卡 + 正文表格。
 *
 * 这款界面从头到尾不画阴影、不画海报，靠字号层级和细线分块 —— 和另外四款的
 * 区别不是配色，是「这里是一份可读的文档」而不是「这里是一块仪表盘」。
 */
const d = useDashboard()
const router = useRouter()
</script>

<template>
  <div class="doc-page">
    <!-- ── Hero ── -->
    <section class="hero">
      <h1 class="hero-h1">
        追番这件事<br>
        <span class="accent">让它自己跑</span>
      </h1>
      <p class="hero-p">
        {{ d.ani.total }} 条订阅在跑，其中 {{ d.ani.enabledCount }} 条启用。
        <template v-if="d.todayLabel.value">{{ d.todayLabel.value }}有 {{ d.today.value.length }} 部要更新。</template>
      </p>
      <div class="d-flex flex-wrap ga-3">
        <v-btn color="primary" size="large" @click="router.push('/subscriptions')">查看订阅</v-btn>
        <v-btn :loading="d.ani.loading" size="large" variant="outlined" @click="d.ani.refreshAll()">
          立即刷新全部
        </v-btn>
      </div>
    </section>

    <!-- ── Feature 卡：文档站首页那三块 ── -->
    <section class="features">
      <a v-for="(s, i) in d.stats.value" :key="s.key" :style="{'--i': i}" class="feature ani-in"
         @click="router.push(s.to)">
        <v-icon :icon="s.icon" class="feature-icon" size="22"/>
        <div class="feature-num">{{ s.value }}</div>
        <div class="feature-label">{{ s.label }}</div>
      </a>
    </section>

    <!-- ── 最近更新 ── -->
    <section>
      <h2 class="h2">最近更新</h2>
      <div v-if="d.firstLoad.value">
        <AniSkeleton :count="5" shape="row"/>
      </div>
      <div v-else-if="d.recent.value.length" class="table-scroll">
        <table class="doc-table">
          <thead>
          <tr>
            <th>标题</th>
            <th class="hide-sm">字幕组</th>
            <th class="num">进度</th>
            <th class="num">更新</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(a, i) in d.recent.value.slice(0, 10)" :key="a.id" :style="{'--i': i}" class="ani-in"
              @click="router.push('/subscriptions')">
            <td class="cell-title">{{ a.title }}</td>
            <td class="hide-sm cell-dim">{{ a.subgroup || '未知字幕组' }}</td>
            <td class="num cell-dim">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</td>
            <td class="num cell-dim">{{ fromNow(a.lastDownloadTime) }}</td>
          </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="dim">还没有下载记录。</p>
    </section>

    <!-- ── 下载中 / 停更：并排两栏 ── -->
    <section class="cols">
      <div>
        <h2 class="h2">下载中</h2>
        <ul v-if="d.torrents.downloading.length" class="plain">
          <li v-for="(t, i) in d.torrents.downloading.slice(0, 6)" :key="t.hash" :style="{'--i': i}" class="ani-in">
            <div class="cell-title">{{ t.name }}</div>
            <div class="d-flex align-center ga-2 mt-1">
              <v-progress-linear :model-value="(t.progress ?? 0) * 100" color="primary" height="3" rounded/>
              <span class="pct">{{ formatPercent(t.progress) }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="dim">{{ d.downloadsHint.value }}</p>
      </div>

      <div>
        <h2 class="h2">疑似停更</h2>
        <ul v-if="d.stalled.value.length" class="plain">
          <li v-for="(a, i) in d.stalled.value.slice(0, 6)" :key="a.id" :style="{'--i': i}" class="ani-in">
            <div class="cell-title">{{ a.title }}</div>
            <div class="pct mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
          </li>
        </ul>
        <p v-else class="dim">字幕组都很勤快。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.doc-page {
    padding: 24px 24px 64px;
}

@media (min-width: 960px) {
    .doc-page {
        padding: 48px 40px 80px;
    }
}

/* ── Hero ── */
.hero {
    padding-bottom: 48px;
    margin-bottom: 40px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.hero-h1 {
    font-size: clamp(2rem, 6vw, 3.4rem);
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -.02em;
    margin-bottom: 20px;
}

/* 文档站首页招牌的渐变字。不支持 background-clip:text 的浏览器退回主色，不会变透明 */
.accent {
    color: rgb(var(--v-theme-primary));
    background: linear-gradient(120deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary, var(--v-theme-primary))));
    -webkit-background-clip: text;
    background-clip: text;
}

@supports (-webkit-background-clip: text) {
    .accent {
        -webkit-text-fill-color: transparent;
    }
}

.hero-p {
    font-size: 1.05rem;
    opacity: .72;
    margin-bottom: 28px;
    max-width: 52ch;
}

/* ── Feature ── */
.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 56px;
}

.feature {
    display: block;
    padding: 20px 22px;
    border-radius: var(--ani-radius, 8px);
    background: rgba(128, 128, 128, .06);
    border: 1px solid transparent;
    cursor: pointer;
    transition: border-color var(--m-dur) var(--m-ease), background-color var(--m-dur) var(--m-ease);
}

.feature:hover {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(128, 128, 128, .1);
}

.feature-icon {
    opacity: .72;
    margin-bottom: 10px;
}

.feature-num {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.feature-label {
    font-size: .82rem;
    opacity: .72;
    margin-top: 6px;
}

/* ── 正文 ── */
.h2 {
    font-size: 1.2rem;
    font-weight: 700;
    padding-bottom: 10px;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

/*
 * 横滚交给外面这层。
 * 表格自己不能写 display:block —— 一写 width:100% 就失效，
 * 列全挤到左边、右侧空出一大片，看着像没写完。
 */
.table-scroll {
    overflow-x: auto;
}

.doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: .9rem;
}

.doc-table th, .doc-table td {
    padding: 9px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(128, 128, 128, .14);
    white-space: nowrap;
}

.doc-table th {
    font-size: .78rem;
    font-weight: 600;
    opacity: .72;
    border-bottom-width: 2px;
}

.doc-table tbody tr {
    cursor: pointer;
}

.doc-table tbody tr:hover {
    background: rgba(128, 128, 128, .07);
}

.num {
    text-align: right !important;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 599px) {
    .hide-sm {
        display: none;
    }
}

.cell-title {
    max-width: 42ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cell-dim, .dim, .pct {
    opacity: .72;
}

.pct {
    flex: 0 0 auto;
    font-size: .75rem;
    font-variant-numeric: tabular-nums;
}

.cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
    margin-top: 48px;
}

@media (min-width: 900px) {
    .cols {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

.plain {
    list-style: none;
    padding: 0;
}

.plain li {
    padding: 10px 0;
    border-bottom: 1px solid rgba(128, 128, 128, .14);
}
</style>
