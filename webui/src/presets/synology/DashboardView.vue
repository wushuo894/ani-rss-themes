<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * DSM 的「系统信息 / 资源监控」那一屏：一块健康状态条 + 一圈使用率 + 几个数字方块，
 * 下面两块列表挂件。
 *
 * 和 M3 那款的指标卡的区别：M3 的卡是 tonal 色块、大圆角、数字在上标签在下；
 * 这一款是白底 + 1px 灰边 + 小圆角，标题在上、数字在下，标题那一行还带一条分隔线 ——
 * 后台管理界面的挂件都是这个结构，看着「像个仪表」，不像「一张卡片」。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')

/** 启用率：DSM 的资源监控里那圈环形表，这里量的是「订阅里有多少条还开着」 */
const enabledPct = computed(() => {
  const total = d.ani.total
  return total ? Math.round((d.ani.enabledCount / total) * 100) : 0
})

/** 健康状态：有疑似停更就转成「注意」，其余都是「良好」—— DSM 的系统健康就这两三档 */
const health = computed(() => (d.stalled.value.length
    ? {color: 'warning', icon: 'mdi-alert-circle-outline', title: '需要注意',
      text: `有 ${d.stalled.value.length} 部订阅疑似停更`}
    : {color: 'success', icon: 'mdi-check-circle-outline', title: '状态良好',
      text: '所有订阅都在正常更新'}))
</script>

<template>
  <div class="pa-4 pa-md-6">
    <!-- ── 系统健康 ── DSM 开机第一眼看的就是这一条 -->
    <v-card class="mb-4 health">
      <v-icon :color="health.color" :icon="health.icon" size="34"/>
      <div class="min0">
        <div class="health-title">{{ health.title }}</div>
        <div class="health-text">{{ health.text }}</div>
      </div>
      <v-spacer/>
      <v-btn :loading="d.ani.loading" size="small" @click="d.ani.refreshAll()">立即刷新</v-btn>
    </v-card>

    <div class="mon mb-4">
      <!-- ── 环形表 ── -->
      <v-card class="widget">
        <div class="widget-head">启用率</div>
        <div class="widget-body ring">
          <v-progress-circular :model-value="enabledPct" :size="112" :width="12" color="primary">
            <span class="ring-num">{{ enabledPct }}%</span>
          </v-progress-circular>
          <div class="ring-side">
            <div><b>{{ d.ani.enabledCount }}</b> 条已启用</div>
            <div class="dim">共 {{ d.ani.total }} 条订阅</div>
          </div>
        </div>
      </v-card>

      <!-- ── 数字方块 ── -->
      <v-card class="widget">
        <div class="widget-head">概况</div>
        <div class="widget-body tiles">
          <template v-if="d.firstLoad.value">
            <AniSkeleton :count="4" shape="stat"/>
          </template>
          <button v-for="st in (d.firstLoad.value ? [] : d.stats.value)" :key="st.key" class="tile"
                  type="button" @click="router.push(st.to)">
            <v-icon :icon="st.icon" size="18"/>
            <span class="tile-num">{{ st.value }}</span>
            <span class="tile-label">{{ st.label }}</span>
          </button>
        </div>
      </v-card>
    </div>

    <div class="mon">
      <!-- ── 今天更新 ── -->
      <v-card class="widget">
        <div class="widget-head">
          {{ d.todayLabel.value || '今天' }}更新
          <span class="dim">{{ d.today.value.length }} 部</span>
        </div>
        <div v-if="d.firstLoad.value" class="widget-body">
          <AniSkeleton :count="4" shape="row"/>
        </div>
        <div v-else-if="d.today.value.length" class="widget-body pa-0">
          <button v-for="a in d.today.value" :key="a.id" class="row" type="button"
                  @click="router.push('/subscriptions')">
            <v-img :src="cover(a.cover)" class="row-thumb" cover height="42" width="30">
              <template #placeholder>
                <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                  <v-icon icon="mdi-image-outline" size="14"/>
                </div>
              </template>
            </v-img>
            <span class="row-name">{{ a.title }}</span>
            <span class="row-info">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
          </button>
        </div>
        <p v-else class="widget-empty">今天没有番要更新。</p>
      </v-card>

      <!-- ── 下载中 ── -->
      <v-card class="widget">
        <div class="widget-head">
          下载中
          <span class="dim">{{ d.torrents.downloading.length }} 个任务</span>
        </div>
        <div v-if="d.torrents.downloading.length" class="widget-body">
          <div v-for="t in d.torrents.downloading.slice(0, 6)" :key="t.hash" class="dl">
            <div class="row-name">{{ t.name }}</div>
            <div class="d-flex align-center ga-3 mt-2">
              <v-progress-linear :model-value="(t.progress ?? 0) * 100" color="primary" height="6" rounded/>
              <span class="row-info">{{ formatPercent(t.progress) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="widget-empty">{{ d.downloadsHint.value }}</p>
      </v-card>
    </div>

    <!-- ── 疑似停更 ── 有才显示：DSM 的挂件里没有「一切正常」的空盒子 -->
    <v-card v-if="d.stalled.value.length" class="widget mt-4">
      <div class="widget-head">
        疑似停更
        <span class="dim">{{ d.stalled.value.length }} 部</span>
      </div>
      <div class="widget-body pa-0">
        <div v-for="a in d.stalled.value.slice(0, 8)" :key="a.id" class="row row-static">
          <v-icon class="ml-1" color="warning" icon="mdi-alert-outline" size="16"/>
          <span class="row-name">{{ a.title }}</span>
          <span class="row-info">最后更新 {{ fromNow(a.lastDownloadTime) }}</span>
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.min0 {
    min-width: 0;
}

.dim {
    opacity: .68;
    font-weight: 400;
}

/* ── 健康条 ── */
.health {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
}

.health-title {
    font-size: 1.02rem;
    font-weight: 600;
}

.health-text {
    font-size: .84rem;
    opacity: .72;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/*
 * 挂件网格：宽屏两列，窄屏一列。
 * 1000px 是量出来的 —— 再窄的话环形表和右边那行字会挤在一起，
 * 而「概况」里的四个方块会掉成 2×2 之后又太高。
 */
.mon {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

@media (min-width: 1000px) {
    .mon {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

/* ── 挂件本体 ── */
.widget {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/*
 * 标题那一行带底色和分隔线 —— 这是 DSM 挂件最好认的一处，
 * 它让每块看着像「一个仪表」，而不是「一张卡片」。
 */
.widget-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(var(--v-theme-on-surface), .04);
    border-bottom: 1px solid rgba(128, 128, 128, .2);
    font-size: .88rem;
    font-weight: 600;
}

.widget-body {
    flex: 1 1 auto;
    padding: 16px;
}

.widget-empty {
    padding: 16px;
    font-size: .84rem;
    opacity: .7;
}

/* ── 环形表 ── */
.ring {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
}

.ring-num {
    font-size: 1.16rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.ring-side {
    min-width: 0;
    font-size: .88rem;
    line-height: 1.8;
}

/* ── 数字方块 ── */
.tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

@media (min-width: 460px) {
    .tiles {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

.tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
    min-height: 76px;
    padding: 10px 12px;
    border: 1px solid rgba(128, 128, 128, .22);
    border-radius: 6px;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
}

.tile:hover {
    background: rgba(var(--v-theme-on-surface), .05);
}

.tile-num {
    font-size: 1.32rem;
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
}

.tile-label {
    max-width: 100%;
    font-size: .74rem;
    opacity: .7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── 列表行 ── */
.row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 6px 16px;
    border: none;
    border-bottom: 1px solid rgba(128, 128, 128, .14);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.row:last-child {
    border-bottom: none;
}

.row:hover {
    background: rgba(var(--v-theme-on-surface), .05);
}

/* 不能点的行别给悬停底色，那会假装它能点 */
.row-static {
    cursor: default;
}

.row-static:hover {
    background: none;
}

.row-thumb {
    flex: 0 0 30px;
    border-radius: 3px;
}

.row-name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: .86rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-info {
    flex: 0 0 auto;
    font-size: .76rem;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}

.dl + .dl {
    margin-top: 14px;
}
</style>
