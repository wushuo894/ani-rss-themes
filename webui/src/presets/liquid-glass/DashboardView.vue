<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'

/**
 * 玻璃板总览：整页只有三块大板，板与板之间留大间距，靠背后的渐变透出来分层。
 *
 * 刻意不切成一堆小卡 —— 玻璃是靠边缘那圈高光被认出来的，卡越小边缘占比越高，
 * 一屏十几块就糊成一片亮边。板少而大，材质才成立。
 *
 * 头板拿最近一部的封面当背景再压重模糊：这是「玻璃后面确实有东西」最直接的证据。
 */
const d = useDashboard()
const router = useRouter()

const featured = computed(() => d.today.value[0] ?? d.recent.value[0])
const cover = (c?: string) => (c ? toApiFile(c) : '')

/*
 * 头板背景。地址必须带双引号包住：封面在演示构建里是 data: URI，
 * 里面的括号和单引号原样保留（encodeURIComponent 不转义它们），
 * 不包引号的话 url() 会在第一个右括号处提前结束，整张图不显示。
 * 拼在这里而不是模板里 —— 模板属性本身就用双引号，嵌不进去。
 */
const heroBg = computed(() => {
  const c = featured.value?.cover
  return c ? `url("${toApiFile(c)}")` : 'none'
})
</script>

<template>
  <div class="glass-page">
    <!-- ── 头板 ── -->
    <section class="slab hero ani-in">
      <div v-if="featured?.cover" :style="{backgroundImage: heroBg}" class="hero-bg"/>
      <div class="hero-body">
        <div class="eyebrow">{{ d.todayLabel.value || '今天' }}</div>
        <h1 class="hero-num">{{ d.today.value.length }}</h1>
        <div class="hero-cap">部番今天更新</div>

        <div v-if="featured" class="feature-line">
          <v-avatar v-if="featured.cover" rounded="lg" size="46">
            <v-img :src="cover(featured.cover)" cover/>
          </v-avatar>
          <div class="min0">
            <div class="feature-title">{{ featured.title }}</div>
            <div class="feature-sub">
              {{ featured.subgroup || '未知字幕组' }} ·
              {{ formatEpisodes(featured.currentEpisodeNumber, featured.totalEpisodeNumber) }}
            </div>
          </div>
          <v-btn class="flex-grow-0" rounded="pill" variant="flat" @click="router.push('/subscriptions')">
            全部订阅
          </v-btn>
        </div>
      </div>
    </section>

    <!-- ── 数字板：2×2，数字给到最大 ── -->
    <section class="slab nums ani-in" style="--i: 1">
      <button v-for="s in d.stats.value" :key="s.key" class="num-cell" @click="router.push(s.to)">
        <div class="num-v">{{ d.firstLoad.value ? '—' : s.value }}</div>
        <div class="num-l">{{ s.label }}</div>
      </button>
    </section>

    <!-- ── 活动板 ── -->
    <section class="slab ani-in" style="--i: 2">
      <div class="d-flex align-center mb-4">
        <h2 class="slab-title">正在下载</h2>
        <v-spacer/>
        <v-btn :loading="d.ani.loading" icon="mdi-refresh" size="small" variant="text"
               @click="d.ani.refreshAll()"/>
      </div>

      <div v-if="d.torrents.downloading.length" class="rows">
        <div v-for="t in d.torrents.downloading.slice(0, 5)" :key="t.hash" class="dl">
          <div class="dl-name">{{ t.name }}</div>
          <div class="dl-bar">
            <div class="dl-fill" :style="{width: `${t.progress}%`}"/>
          </div>
          <div class="dl-pct">{{ formatPercent(t.progress) }}</div>
        </div>
      </div>
      <p v-else class="dim">{{ d.downloadsHint.value }}</p>

      <template v-if="d.stalled.value.length">
        <v-divider class="my-5"/>
        <h2 class="slab-title mb-3">
          疑似停更
          <span class="badge">{{ d.stalled.value.length }}</span>
        </h2>
        <div class="rows">
          <div v-for="a in d.stalled.value.slice(0, 5)" :key="a.id" class="dl">
            <div class="dl-name">{{ a.title }}</div>
            <div class="dl-pct">{{ fromNow(a.lastDownloadTime) }}</div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.glass-page {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 16px;
    max-width: 1100px;
    margin: 0 auto;
}

@media (min-width: 960px) {
    .glass-page {
        gap: 28px;
        padding: 24px;
    }
}

.min0 {
    flex: 1 1 auto;
    min-width: 0;
}

/*
 * 一块玻璃板。
 * 边框上亮下暗 + 内侧一道高光 = 边缘折射；外阴影负责把它从背景里抬起来。
 * 只写内阴影的话板子看着是「陷进去」的，正好和想要的效果相反。
 */
.slab {
    position: relative;
    overflow: hidden;
    padding: 22px;
    border-radius: 26px;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, .66));
    backdrop-filter: blur(var(--ani-panel-blur, 22px)) saturate(1.35);
    -webkit-backdrop-filter: blur(var(--ani-panel-blur, 22px)) saturate(1.35);
    border: 1px solid rgba(255, 255, 255, .3);
    border-top-color: rgba(255, 255, 255, .5);
    box-shadow: 0 18px 48px rgba(0, 0, 0, .22),
    inset 0 1px 0 rgba(255, 255, 255, .5),
    inset 0 -1px 0 rgba(255, 255, 255, .12);
}

@media (min-width: 960px) {
    .slab {
        padding: 30px 34px;
    }
}

/* ── 头板 ── */
.hero {
    min-height: 210px;
}

/*
 * 封面当背景，压到很糊 —— 要的是「玻璃后面有内容」的一团颜色，不是这张图本身。
 *
 * 两处克制是必须的：
 *  - 透明度压到 .3。给到 .55 时整块板被封面的主色刷满，看起来不是玻璃，
 *    是一张绿卡片，材质感全没了。
 *  - 用横向遮罩让它从右边淡进来，左边留给文字。铺满整块的话大数字压在色块上，
 *    换一张暖色封面立刻读不出来。
 * scale 是为了让 blur 的羽化边跑到板外，否则四周会露出一圈没模糊的硬边。
 */
.hero-bg {
    position: absolute;
    inset: -12%;
    background-size: cover;
    background-position: center;
    filter: blur(38px) saturate(1.6);
    opacity: .3;
    transform: scale(1.08);
    -webkit-mask-image: linear-gradient(100deg, transparent 18%, #000 78%);
    mask-image: linear-gradient(100deg, transparent 18%, #000 78%);
    pointer-events: none;
}

.hero-body {
    position: relative;
}

.eyebrow {
    font-size: .8rem;
    letter-spacing: .1em;
    text-transform: uppercase;
    opacity: .72;
}

.hero-num {
    font-size: clamp(3rem, 11vw, 4.6rem);
    font-weight: 300;
    line-height: 1;
    letter-spacing: -.03em;
    font-variant-numeric: tabular-nums;
}

.hero-cap {
    font-size: 1rem;
    opacity: .74;
    margin-top: 2px;
}

.feature-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(var(--v-theme-surface), .55);
    border: 1px solid rgba(255, 255, 255, .3);
}

.feature-title {
    font-weight: 600;
    font-size: .92rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.feature-sub {
    font-size: .76rem;
    opacity: .72;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── 数字板 ── */
.nums {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 10px;
}

@media (min-width: 720px) {
    .nums {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

.num-cell {
    padding: 18px 12px;
    border-radius: 20px;
    text-align: left;
    transition: background-color var(--m-dur) var(--m-ease), transform var(--m-dur) var(--m-ease);
}

.num-cell:hover {
    background: rgba(255, 255, 255, .12);
}

.num-cell:active {
    transform: scale(.96);
}

.num-v {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    font-weight: 300;
    line-height: 1;
    letter-spacing: -.02em;
    font-variant-numeric: tabular-nums;
}

.num-l {
    font-size: .78rem;
    opacity: .72;
    margin-top: 6px;
}

/* ── 活动板 ── */
.slab-title {
    font-size: 1rem;
    font-weight: 600;
}

.badge {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 9px;
    border-radius: 999px;
    font-size: .72rem;
    background: rgba(var(--v-theme-warning), .28);
}

.rows {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.dl {
    display: flex;
    align-items: center;
    gap: 12px;
}

.dl-name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: .86rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 自己画进度条：Vuetify 那条是方的直角，跟这套 26px 圆角的语言对不上 */
.dl-bar {
    flex: 0 0 110px;
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(var(--v-theme-on-surface), .14);
}

.dl-fill {
    height: 100%;
    border-radius: 999px;
    background: rgb(var(--v-theme-primary));
    transition: width .5s var(--m-ease);
}

.dl-pct {
    flex: 0 0 auto;
    font-size: .74rem;
    opacity: .72;
    font-variant-numeric: tabular-nums;
}

.dim {
    font-size: .86rem;
    opacity: .72;
}

@media (max-width: 599px) {
    .dl-bar {
        flex-basis: 64px;
    }
}
</style>
