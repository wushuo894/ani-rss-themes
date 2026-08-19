<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {formatPercent, fromNow} from '@shared/format'
import {toApiFile} from '@shared/http'
import {useAniStore} from '@/stores/ani'
import {useTorrentsStore} from '@/stores/torrents'
import {useConfigStore} from '@/stores/config'

const ani = useAniStore()
const torrents = useTorrentsStore()
const config = useConfigStore()
const router = useRouter()

onMounted(() => {
  if (!ani.all.length) void ani.reload()
  void config.load()
  // 总览页的下载卡片刷新可以慢一些，这里不需要 3 秒级的实时性
  torrents.startPolling(8000)
})
onBeforeUnmount(() => torrents.stopPolling())

/** 最近更新的 12 部，按最后下载时间倒序；从未下载过的排在最后 */
const recent = computed(() =>
    [...ani.all]
        .filter(a => a.lastDownloadTime)
        .sort((a, b) => (b.lastDownloadTime ?? 0) - (a.lastDownloadTime ?? 0))
        .slice(0, 12),
)

/** 摸鱼检测：后端标了 procrastinating 的，说明字幕组很久没更新了 */
const stalled = computed(() => ani.all.filter(a => a.procrastinating && a.enable))

const stats = computed(() => [
  {label: '订阅总数', value: ani.total, icon: 'mdi-television-play', to: '/subscriptions'},
  {label: '已启用', value: ani.enabledCount, icon: 'mdi-check-circle-outline', to: '/subscriptions'},
  {label: '下载中', value: torrents.downloading.length, icon: 'mdi-download', to: '/downloads'},
  {label: '做种中', value: torrents.seeding.length, icon: 'mdi-upload', to: '/downloads'},
])
</script>

<template>
  <div class="pa-4">
    <!-- ── 指标卡 ── -->
    <div class="stat-grid mb-6">
      <v-card v-for="s in stats" :key="s.label" :to="s.to" variant="tonal">
        <v-card-text class="d-flex align-center ga-3">
          <v-avatar color="primary" size="40" variant="tonal">
            <v-icon>{{ s.icon }}</v-icon>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-medium">{{ s.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ s.label }}</div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- ── 快捷操作 ── -->
    <div class="d-flex flex-wrap ga-2 mb-6">
      <v-btn :loading="ani.loading" prepend-icon="mdi-refresh" variant="tonal" @click="ani.refreshAll()">
        刷新全部订阅
      </v-btn>
      <v-btn prepend-icon="mdi-plus" variant="tonal" @click="router.push('/subscriptions')">添加订阅</v-btn>
      <v-btn prepend-icon="mdi-cog-outline" variant="tonal" @click="router.push('/settings')">设置</v-btn>
    </div>

    <v-row>
      <!-- ── 最近更新 ── -->
      <v-col cols="12" md="7">
        <v-card variant="flat">
          <v-card-title class="text-subtitle-1">最近更新</v-card-title>
          <v-divider/>
          <v-list v-if="recent.length" density="comfortable">
            <v-list-item v-for="a in recent" :key="a.id" :subtitle="`${a.subgroup || '未知字幕组'} · 第 ${a.currentEpisodeNumber ?? 0} 集`"
                         :title="a.title" @click="router.push('/subscriptions')">
              <template #prepend>
                <v-avatar rounded size="40">
                  <v-img :src="a.cover ? toApiFile(a.cover) : ''"/>
                </v-avatar>
              </template>
              <template #append>
                <span class="text-caption text-medium-emphasis">{{ fromNow(a.lastDownloadTime) }}</span>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">还没有下载记录。</v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <!-- ── 下载中 ── -->
        <v-card class="mb-4" variant="flat">
          <v-card-title class="text-subtitle-1">下载中</v-card-title>
          <v-divider/>
          <v-list v-if="torrents.downloading.length" density="comfortable">
            <v-list-item v-for="t in torrents.downloading.slice(0, 6)" :key="t.hash" :title="t.name">
              <template #subtitle>
                <div class="d-flex align-center ga-2 mt-1">
                  <v-progress-linear :model-value="(t.progress ?? 0) * 100" color="primary" height="4" rounded/>
                  <span class="text-caption">{{ formatPercent(t.progress) }}</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">
            {{ torrents.error ? '下载器未连接' : '当前没有下载任务' }}
          </v-card-text>
        </v-card>

        <!-- ── 摸鱼检测：这是真正需要人介入的东西，所以给它一张卡 ── -->
        <v-card v-if="stalled.length" variant="flat">
          <v-card-title class="text-subtitle-1 d-flex align-center">
            疑似停更
            <v-chip class="ml-2" color="warning" size="x-small" variant="tonal">{{ stalled.length }}</v-chip>
          </v-card-title>
          <v-divider/>
          <v-list density="comfortable">
            <v-list-item v-for="a in stalled.slice(0, 6)" :key="a.id"
                         :subtitle="`最后更新 ${fromNow(a.lastDownloadTime)}`" :title="a.title"/>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
}
</style>
