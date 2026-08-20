<script setup lang="ts">
import {onMounted, ref} from 'vue'
import type {About} from '@shared/types'
import * as api from '@shared/api'
import {formatSize} from '@shared/format'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'

const store = useConfigStore()
const ui = useUiStore()

const info = ref<About | null>(null)
const loading = ref(false)
const busy = ref('')
const confirmStop = ref<number | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  try {
    info.value = await api.about()
  } finally {
    loading.value = false
  }
}

async function doUpdate() {
  busy.value = 'update'
  try {
    await api.update()
    ui.success('已触发更新，稍后服务会自行重启')
  } finally {
    busy.value = ''
  }
}

/* 后端 AboutController#stop 的第一行是 `List.of("重启", "关闭").get(status)`，
   接着 `System.exit(status)` —— 也就是 **0 是重启、1 是关闭**，
   和这个端点的名字（stop）给人的直觉相反。上游 UI 也是 stop(0)=重启、stop(1)=关闭。
   原来这里的注释写反了（「0 停止，1 重启」），两个按钮跟着接反：
   点「重启服务」实际发的是关闭，服务直接停掉、网页再也打不开，得去服务器上手动起。
   用具名常量钉死，不要再出现裸的 0 / 1。 */
const RESTART = 0
const SHUTDOWN = 1

async function doStop(status: number) {
  busy.value = 'stop'
  try {
    await api.stop(status)
    ui.info(status === RESTART ? '已发送重启指令' : '已发送停止指令')
  } finally {
    busy.value = ''
    confirmStop.value = null
  }
}
</script>

<template>
  <div>
    <!-- 这张卡不用 tonal：里面还有 tonal 的状态药丸，一层染色叠一层，
         药丸的字和它自己的底就只剩 3.8:1 了 —— 嵌套染色是对比度的隐形杀手 -->
    <v-card class="mb-4" variant="flat">
      <v-card-text>
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <span class="text-h6">ani-rss</span>
          <v-chip size="small" variant="tonal">{{ info?.version || store.config.version || '—' }}</v-chip>
          <v-chip v-if="info?.update" color="warning" size="small" variant="tonal">
            有新版本 {{ info.latest }}
          </v-chip>
          <v-chip v-else-if="info" color="success" size="small" variant="tonal">已是最新</v-chip>
        </div>

        <div v-if="store.config.gitInfo" class="text-caption text-medium-emphasis">
          构建：{{ store.config.gitInfo.branch }} @ {{ store.config.gitInfo.shortCommitId }}
        </div>
        <div v-if="info?.date" class="text-caption text-medium-emphasis">发布时间：{{ info.date }}</div>
        <div v-if="info?.size" class="text-caption text-medium-emphasis">
          安装包：{{ info.formatSize || formatSize(info.size) }}
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-btn :loading="loading" prepend-icon="mdi-refresh" variant="tonal" @click="load">检查更新</v-btn>
      <v-btn v-if="info?.update" :loading="busy === 'update'" color="primary" prepend-icon="mdi-download"
             variant="flat" @click="doUpdate">
        更新到 {{ info.latest }}
      </v-btn>
      <v-btn v-if="info?.downloadUrl" :href="info.downloadUrl" prepend-icon="mdi-open-in-new" target="_blank"
             variant="text">
        手动下载
      </v-btn>
    </div>

    <!-- 更新说明是 Markdown，这里不引 Markdown 渲染库，原样等宽显示即可 -->
    <v-card v-if="info?.markdownBody" class="mb-4" variant="flat">
      <v-card-title class="text-subtitle-2">更新内容</v-card-title>
      <v-divider/>
      <v-card-text>
        <pre class="changelog">{{ info.markdownBody }}</pre>
      </v-card-text>
    </v-card>

    <v-divider class="mb-4"/>

    <div class="text-subtitle-2 mb-2">服务</div>
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-btn prepend-icon="mdi-restart" variant="tonal" @click="confirmStop = RESTART">重启服务</v-btn>
      <v-btn color="error" prepend-icon="mdi-power" variant="tonal" @click="confirmStop = SHUTDOWN">
        停止服务
      </v-btn>
    </div>

    <div class="d-flex flex-wrap ga-3 text-caption">
      <a class="text-medium-emphasis" href="https://docs.wushuo.top" rel="noopener" target="_blank">文档</a>
      <a class="text-medium-emphasis" href="https://github.com/wushuo894/ani-rss" rel="noopener" target="_blank">
        GitHub
      </a>
    </div>

    <v-dialog :model-value="confirmStop !== null" max-width="400" @update:model-value="confirmStop = null">
      <v-card>
        <v-card-title>{{ confirmStop === SHUTDOWN ? '停止服务' : '重启服务' }}</v-card-title>
        <v-card-text>
          <p class="mb-0">
            {{
              confirmStop === SHUTDOWN
                  ? '停止后需要在服务器上手动启动，网页将无法继续使用。'
                  : '服务会短暂中断，稍后自行恢复。'
            }}
          </p>
          <!-- 后端对 exe 版直接拒绝重启（「Windows 端不支持重启」），提前说一声，
               免得点下去只收到一句报错不知道为什么 -->
          <p v-if="confirmStop === RESTART" class="text-caption text-medium-emphasis mt-2 mb-0">
            Windows 的 .exe 版本不支持重启，服务端会直接拒绝。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="confirmStop = null">取消</v-btn>
          <v-btn :color="confirmStop === SHUTDOWN ? 'error' : 'primary'" :loading="busy === 'stop'" variant="flat"
                 @click="doStop(confirmStop!)">
            确定
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.changelog {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: .8125rem;
    line-height: 1.6;
    margin: 0;
}
</style>
