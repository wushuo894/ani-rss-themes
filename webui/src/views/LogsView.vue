<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {downloadLogsUrl} from '@shared/api'
import {useLogsStore} from '@/stores/logs'

const logs = useLogsStore()
const confirmClear = ref(false)
/** 新日志追加在末尾，默认贴底；用户往上翻查旧日志时不要把人拽回底部 */
const follow = ref(true)
const box = ref<HTMLElement | null>(null)

onMounted(() => logs.startPolling(5000))
onBeforeUnmount(() => logs.stopPolling())

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

const levelItems = computed(() => [
  {title: '全部级别', value: ''},
  ...logs.levels.map(l => ({title: l, value: l})),
])

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
      <v-select v-model="logs.level" :items="levelItems" density="compact" hide-details style="max-width: 160px"/>
      <v-chip variant="tonal">{{ logs.filtered.length }} 条</v-chip>
      <v-chip :color="follow ? 'primary' : undefined" size="small" variant="tonal"
              @click="follow = !follow">
        {{ follow ? '跟随最新' : '已暂停跟随' }}
      </v-chip>
      <v-spacer/>
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
/* 让日志区域自己占满视口剩余高度，内部滚动，页面本身不滚 */
.logs-page {
    height: calc(100vh - 64px);
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

/* 长路径和堆栈要能换行，否则整行横向溢出 */
.log-msg {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
