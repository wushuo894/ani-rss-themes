<script setup lang="ts">
import {computed, nextTick, onActivated, onDeactivated, ref, watch} from 'vue'
import {downloadLogsUrl} from '@shared/api'
import {useLogsStore} from '@/stores/logs'

const logs = useLogsStore()
const confirmClear = ref(false)
/** 新日志追加在末尾，默认贴底；用户往上翻查旧日志时不要把人拽回底部 */
const follow = ref(true)
const box = ref<HTMLElement | null>(null)

onActivated(() => logs.startPolling(5000))
onDeactivated(() => logs.stopPolling())

watch(() => logs.filtered.length, async () => {
  if (!follow.value) return
  await nextTick()
  const el = box.value
  if (el) el.scrollTop = el.scrollHeight
})

function onScroll() {
  const el = box.value
  if (!el) return
  follow.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

/** 类名太长，下拉里只显示最后一段（org.x.y.AniService → AniService） */
const short = (n: string) => n.slice(n.lastIndexOf('.') + 1)
const loggerItems = computed(() => logs.allLoggers.map(n => ({title: short(n), subtitle: n, value: n})))

function levelColor(l?: string) {
  switch ((l || '').toUpperCase()) {
    case 'ERROR':
      return 'error'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'info'
    default:
      return undefined
  }
}
</script>

<template>
  <div class="pa-4 d-flex flex-column logs-page">
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-text-field v-model="logs.keyword" class="flex-grow-1" clearable density="compact" hide-details
                    placeholder="过滤日志内容" prepend-inner-icon="mdi-magnify" style="max-width: 320px"/>
      <!-- 级别和类名都能多选：查一次问题通常要「WARN + ERROR」一起看，
           或者只盯住某个类。单选筛不出这两种最常用的组合。 -->
      <v-select v-model="logs.level" :items="logs.levels" chips closable-chips density="compact" hide-details
                multiple placeholder="全部级别" style="max-width: 200px"/>
      <v-select v-model="logs.loggerNames" :items="loggerItems" density="compact" hide-details
                item-props multiple placeholder="全部类名" style="max-width: 220px">
        <template #selection="{item, index}">
          <span v-if="index === 0" class="text-caption">{{ short(item.value) }}</span>
          <span v-else-if="index === 1" class="text-caption text-medium-emphasis ml-1">
            +{{ logs.loggerNames.length - 1 }}
          </span>
        </template>
      </v-select>
      <v-chip variant="tonal">{{ logs.filtered.length }} 条</v-chip>
      <v-chip :color="follow ? 'primary' : undefined" size="small" variant="tonal"
              @click="follow = !follow">
        {{ follow ? '跟随最新' : '已暂停跟随' }}
      </v-chip>
      <v-spacer/>
      <v-btn :loading="logs.loading" icon="mdi-refresh" title="立刻刷新" variant="text" @click="logs.reload()"/>
      <v-btn :href="downloadLogsUrl()" prepend-icon="mdi-download" target="_blank" variant="tonal">下载</v-btn>
      <v-btn color="error" prepend-icon="mdi-delete-sweep-outline" variant="tonal" @click="confirmClear = true">
        清空
      </v-btn>
    </div>

    <v-card class="flex-grow-1 overflow-hidden" variant="flat">
      <div ref="box" class="log-box" @scroll="onScroll">
        <div v-for="(l, i) in logs.filtered" :key="i" class="log-line">
          <v-chip :color="levelColor(l.level)" class="mr-2 flex-shrink-0" label size="x-small" variant="tonal">
            {{ l.level }}
          </v-chip>
          <span v-if="l.loggerName" class="log-logger flex-shrink-0" :title="l.loggerName">
            {{ short(l.loggerName) }}
          </span>
          <span class="log-msg">{{ l.message }}</span>
        </div>
        <div v-if="!logs.filtered.length" class="pa-6 text-center text-medium-emphasis">暂无日志</div>
      </div>
    </v-card>

    <v-dialog v-model="confirmClear" max-width="380">
      <v-card>
        <v-card-title>清空日志</v-card-title>
        <v-card-text>日志将被永久清除，无法恢复。</v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="confirmClear = false">取消</v-btn>
          <v-btn color="error" variant="flat" @click="logs.clear(); confirmClear = false">清空</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/*
 * 让日志区域自己占满视口剩余高度，内部滚动，页面本身不滚。
 * 高度按 Vuetify 实际算出来的布局边距扣，别写死 64 —— 五款顶栏不一样高。
 * 外壳自己额外占掉的（悬浮岛、底部导航垫片）写在 --ani-page-*，Vuetify 算不到。
 * dvh 是为了地址栏收起时不把底部顶出屏幕。
 */
.logs-page {
    height: calc(100vh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
    height: calc(100dvh - var(--v-layout-top, 0px) - var(--v-layout-bottom, 0px)
    - var(--ani-page-top, 0px) - var(--ani-page-bottom, 0px));
}

/* 同 SettingsView：能滚的那一段必须允许缩到 0，否则日志一多就把上面的筛选栏压扁 */
.logs-page > .v-card {
    flex: 1 1 0;
    min-height: 0;
}

.logs-page > :not(.v-card) {
    flex: 0 0 auto;
}

.log-box {
    height: 100%;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: .8125rem;
    line-height: 1.6;
}

.log-line {
    display: flex;
    align-items: flex-start;
    padding: 1px 0;
}

/* 类名放在级别和正文之间，压暗当次要信息；定宽让多行的正文左边缘对齐 */
.log-logger {
    width: 13ch;
    margin-right: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: .55;
}

/* 长路径和堆栈要能换行，否则整行横向溢出 */
.log-msg {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
