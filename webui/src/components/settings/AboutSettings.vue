<script setup lang="ts">
import {onMounted, ref} from 'vue'
import type {About} from '@shared/types'
import * as api from '@shared/api'
import {formatSize} from '@shared/format'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'
import presetMeta from '@preset/meta'

const store = useConfigStore()
const ui = useUiStore()

const info = ref<About | null>(null)
const loading = ref(false)
const busy = ref('')
const confirmStop = ref<number | null>(null)

/* 这套界面自己的版本号：构建期注入，和发布包里 webui.json 的 version 同一个数 ——
   后端就是拿那个数跟 Release 的 tag 比来判断有没有新版的 */
const WEBUI_VERSION = __VERSION__
/** 后端返回的 UpdateInfo（字段同 About，只是没有 version） */
const webui = ref<About | null>(null)
/** 老版本 ani-rss 没有 /api/webui/*，探测失败就只显示版本号、不给更新入口 */
const webuiSupported = ref(true)

onMounted(load)

async function load() {
  loading.value = true
  try {
    // 两趟一起发；WebUI 那趟自己吞异常，老后端上不能连累 ani-rss 这块
    const [about] = await Promise.all([api.about(), loadWebui()])
    info.value = about
  } finally {
    loading.value = false
  }
}

async function loadWebui() {
  try {
    webui.value = await api.webuiGetUpdate()
    webuiSupported.value = true
  } catch {
    webui.value = null
    webuiSupported.value = false
  }
}

async function doWebuiUpdate() {
  busy.value = 'webui'
  try {
    await api.webuiUpdate()
    /* 后端是「删掉整个 webui 目录再解压」，现在页面上跑的这份文件已经不在了。
       资源名带哈希、index.html 又是网络优先（见 public/sw.js），刷新就能拿到新的。 */
    ui.success('界面已更新，正在重新加载')
    setTimeout(() => location.reload(), 1200)
  } finally {
    busy.value = ''
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

    <!-- 替换掉 ani-rss 自带界面的就是这套东西，它和 ani-rss 各更新各的：
         同一张卡里放两个版本号只会让人分不清刚才更新的是哪个 -->
    <v-card class="mb-4" variant="flat">
      <v-card-text>
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <span class="text-h6">{{ presetMeta.name }} WebUI</span>
          <v-chip size="small" variant="tonal">{{ WEBUI_VERSION }}</v-chip>
          <v-chip v-if="webui?.update" color="warning" size="small" variant="tonal">
            有新版本 {{ webui.latest }}
          </v-chip>
          <v-chip v-else-if="webui" color="success" size="small" variant="tonal">已是最新</v-chip>
        </div>

        <div v-if="!webuiSupported" class="text-caption text-medium-emphasis">
          当前 ani-rss 不支持在线更新界面，去 Releases 下压缩包解压到 config/webui/ 覆盖即可。
        </div>
        <template v-else>
          <div v-if="webui?.date" class="text-caption text-medium-emphasis">发布时间：{{ webui.date }}</div>
          <div v-if="webui?.size" class="text-caption text-medium-emphasis">
            压缩包：{{ webui.formatSize || formatSize(webui.size) }}
          </div>
          <!-- 更新是「删掉整个 webui 目录再解压」，放进去的额外文件会一起没 -->
          <div v-if="webui?.update" class="text-caption text-medium-emphasis">
            更新会先清空 config/webui/ 再解压，自己往里放过的文件请先备份。
          </div>
        </template>
      </v-card-text>
    </v-card>

    <div v-if="webuiSupported && (webui?.update || webui?.downloadUrl)" class="d-flex flex-wrap ga-2 mb-4">
      <v-btn v-if="webui?.update" :loading="busy === 'webui'" color="primary" prepend-icon="mdi-download"
             variant="flat" @click="doWebuiUpdate">
        更新界面到 {{ webui.latest }}
      </v-btn>
      <v-btn v-if="webui?.downloadUrl" :href="webui.downloadUrl" prepend-icon="mdi-open-in-new" target="_blank"
             variant="text">
        手动下载
      </v-btn>
    </div>

    <v-card v-if="webui?.update && webui.markdownBody" class="mb-4" variant="flat">
      <v-card-title class="text-subtitle-2">界面更新内容</v-card-title>
      <v-divider/>
      <v-card-text>
        <pre class="changelog">{{ webui.markdownBody }}</pre>
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
      <a class="text-medium-emphasis touch-link" href="https://docs.wushuo.top" rel="noopener" target="_blank">文档</a>
      <a class="text-medium-emphasis touch-link" href="https://github.com/wushuo894/ani-rss" rel="noopener" target="_blank">
        GitHub
      </a>
      <!-- 上游关于页给了四个入口，我们之前只留了两个 -->
      <a class="text-medium-emphasis touch-link" href="https://docs.wushuo.top/history" rel="noopener" target="_blank">
        更新历史
      </a>
      <a class="text-medium-emphasis touch-link" href="https://t.me/ani_rss" rel="noopener" target="_blank">TG 群</a>
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
    /* 走主题变量：scoped 的权重压过 base.css 那条，写死的话皮肤给的等宽字栈永远不生效 */
    font-family: var(--ani-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: .8125rem;
    line-height: 1.6;
    margin: 0;
}
</style>
