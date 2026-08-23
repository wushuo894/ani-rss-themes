<script setup lang="ts">
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * Auto_Bangumi 的总览 = 它的放送日历。
 *
 * 原版没有「总览」这一页，它的第二个菜单是 Calendar：一周七列，每列摞着那天更新的番。
 * 追番的人一进来最想知道的就是这个，所以这一款的落地页照它来 ——
 * 指标条只占顶上一行，剩下的高度全给日历。
 *
 * 每块面板仍然是外壳那套「浮起的圆角板」：1px 描边 + 极淡阴影，不投重影。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')
</script>

<template>
  <div class="pa-3 pa-lg-4">
    <div class="stats mb-4">
      <template v-if="d.firstLoad.value">
        <AniSkeleton :count="4" shape="stat"/>
      </template>
      <div v-for="(s, i) in (d.firstLoad.value ? [] : d.stats.value)" :key="s.key" :style="{'--i': i}"
           class="panel stat ani-in" @click="router.push(s.to)">
        <v-icon :icon="s.icon" class="stat-icon" size="18"/>
        <div class="stat-num">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- ── 放送日历 ── -->
    <div class="panel pa-3 mb-4">
      <div class="d-flex align-center mb-3">
        <h2 class="head">放送日历</h2>
        <span class="head-sub ml-2">{{ d.todayLabel.value || '今天' }}有 {{ d.today.value.length }} 部要更新</span>
        <v-spacer/>
        <v-btn :loading="d.ani.loading" size="small" variant="text" @click="d.ani.refreshAll()">刷新</v-btn>
      </div>

      <div v-if="d.firstLoad.value" class="cal">
        <div v-for="i in 7" :key="i" class="col">
          <div class="sk" style="height: 92px; border-radius: 8px"/>
        </div>
      </div>

      <!-- byWeek 的第一组就是今天（后端排好的），所以第一列自带高亮 -->
      <div v-else-if="d.ani.byWeek.length" class="cal">
        <section v-for="(w, wi) in d.ani.byWeek" :key="w.label" :class="{today: wi === 0}" class="col">
          <div class="col-head">
            {{ w.label }}
            <span class="col-count">{{ w.items.length }}</span>
          </div>
          <div class="col-body">
            <div v-for="a in w.items" :key="a.id" :title="a.title" class="cell"
                 @click="router.push('/subscriptions')">
              <v-img :alt="a.title" :src="cover(a.cover)" aspect-ratio="0.714" class="cell-art" cover>
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                    <v-icon class="text-medium-emphasis" icon="mdi-image-outline" size="18"/>
                  </div>
                </template>
              </v-img>
              <div class="cell-name">{{ a.title }}</div>
              <div class="cell-ep">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</div>
            </div>
            <p v-if="!w.items.length" class="col-empty">—</p>
          </div>
        </section>
      </div>

      <v-empty-state v-else icon="mdi-calendar-blank-outline" text="添加订阅之后这里会排出一周的放送表" title="日历还是空的"/>
    </div>

    <div class="two-col">
      <div class="panel pa-3">
        <h2 class="head mb-3">下载中</h2>
        <div v-if="d.torrents.downloading.length">
          <div v-for="(t, i) in d.torrents.downloading.slice(0, 6)" :key="t.hash" :style="{'--i': i}"
               class="line ani-in">
            <div class="ellipsis">{{ t.name }}</div>
            <div class="d-flex align-center ga-3 mt-2">
              <v-progress-linear :model-value="t.progress" color="primary" height="4" rounded/>
              <span class="num">{{ formatPercent(t.progress) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="hint">{{ d.downloadsHint.value }}</p>
      </div>

      <div class="panel pa-3">
        <h2 class="head mb-3">
          疑似停更
          <span v-if="d.stalled.value.length" class="warn-count">{{ d.stalled.value.length }}</span>
        </h2>
        <div v-if="d.stalled.value.length">
          <div v-for="(a, i) in d.stalled.value.slice(0, 6)" :key="a.id" :style="{'--i': i}" class="line ani-in">
            <div class="ellipsis">{{ a.title }}</div>
            <div class="num mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
          </div>
        </div>
        <p v-else class="hint">字幕组都很勤快。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 外壳那套板的样子，总览页里的每一块也按它来 */
.panel {
    border: 1px solid rgba(var(--v-theme-on-surface), .12);
    border-radius: var(--ab-radius);
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 1px 2px rgba(0, 0, 0, .05);
}

.stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

@media (min-width: 640px) {
    .stats {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

.stat {
    padding: 12px 14px;
    cursor: pointer;
    transition: border-color var(--m-dur) var(--m-ease);
}

.stat:hover {
    border-color: rgba(var(--v-theme-primary), .5);
}

.stat-icon {
    opacity: .6;
}

.stat-num {
    font-size: 1.6rem;
    font-weight: 600;
    line-height: 1.2;
    margin-top: 4px;
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: .75rem;
    opacity: .7;
}

.head {
    font-size: 1rem;
    font-weight: 600;
}

.head-sub {
    font-size: .78rem;
    opacity: .7;
}

/*
 * 日历：一周七列横着排，列内竖着摞。
 *
 * 窄屏不改成七行 —— 那就是把「一周」拆成七段，得滚七屏才看得完，
 * 日历的意义（一眼看出哪天最忙）当场消失。改成整条横向滚，一列 132px。
 */
.cal {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(132px, 1fr);
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
}

.col {
    min-width: 0;
    border-radius: 8px;
    background: rgba(var(--v-theme-on-surface), .04);
    overflow: hidden;
}

/* 今天那一列点一层主色，不加边框 —— 加了会和外面那圈描边打架 */
.col.today {
    background: rgba(var(--v-theme-primary), .1);
}

.col-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 6px 8px;
    font-size: .78rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .08);
}

.col-count {
    font-size: .7rem;
    opacity: .6;
    font-variant-numeric: tabular-nums;
}

.col-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    max-height: 46vh;
    overflow-y: auto;
}

.cell {
    cursor: pointer;
    transition: transform var(--m-dur) var(--m-ease);
}

.cell:hover {
    transform: translateY(-2px);
}

.cell-art {
    border-radius: 6px;
    overflow: hidden;
}

.cell-name {
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cell-ep {
    font-size: 10px;
    opacity: .65;
    font-variant-numeric: tabular-nums;
}

.col-empty {
    font-size: .75rem;
    opacity: .4;
    text-align: center;
}

.two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}

@media (min-width: 960px) {
    .two-col {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

.line + .line {
    margin-top: 12px;
}

.line {
    font-size: .82rem;
}

.warn-count {
    display: inline-block;
    margin-left: 6px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: .7rem;
    color: rgb(var(--v-theme-warning));
    border: 1px solid rgba(var(--v-theme-warning), .5);
}

.hint {
    font-size: .82rem;
    opacity: .7;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.num {
    flex: 0 0 auto;
    font-size: .72rem;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}
</style>
