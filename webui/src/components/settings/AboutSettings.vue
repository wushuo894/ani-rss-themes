<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import type {About} from '@shared/types'
import * as api from '@shared/api'
import {formatSize} from '@shared/format'
import {renderMarkdown} from '@shared/markdown'
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

/* 两段更新说明都是 Markdown。渲染器自己先把整段转义成纯文本再拼标签，所以 v-html 是安全的 */
const aniRssNotes = computed(() => renderMarkdown(info.value?.markdownBody ?? ''))
const webuiNotes = computed(() => renderMarkdown(webui.value?.markdownBody ?? ''))

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

    <!-- 标题必须带上「谁的」：这一页有两段更新说明，都叫「更新内容」的话，
         看到的人只会以为界面在拿 ani-rss 的更新冒充自己的 -->
    <v-card v-if="info?.markdownBody" class="mb-4" variant="flat">
      <v-card-title class="d-flex align-center ga-2 text-subtitle-2">
        <span>ani-rss 更新内容</span>
        <v-chip v-if="info.latest" size="x-small" variant="tonal">{{ info.latest }}</v-chip>
      </v-card-title>
      <v-divider/>
      <v-card-text>
        <div class="md" v-html="aniRssNotes"/>
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

    <!--
      不要求 `update` 为真才显示。原来卡在这个条件上：版本号长期不涨（见 workflow 里
      跟着 run_number 走的那段），`update` 永远是 false，这张卡就一次都没露过面 ——
      于是页面上唯一看得见的「更新内容」是 ani-rss 那一段，看着就像界面在拿别人的更新充数。
      已经是最新版时看一眼这一版改了什么，本来也是正当需求。
    -->
    <v-card v-if="webui?.markdownBody" class="mb-4" variant="flat">
      <v-card-title class="d-flex align-center ga-2 text-subtitle-2">
        <span>{{ presetMeta.name }} WebUI 更新内容</span>
        <v-chip v-if="webui.latest" size="x-small" variant="tonal">{{ webui.latest }}</v-chip>
      </v-card-title>
      <v-divider/>
      <v-card-text>
        <div class="md" v-html="webuiNotes"/>
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
/*
 * 更新说明的版式。内容是 v-html 塞进来的，拿不到 scoped 的那个属性，所以要 :deep。
 * 一律用 :deep(.md xxx) 收口在这张卡里，别写成全局的 h2/li —— 那会波及九款皮肤的所有页面。
 */
.md {
    font-size: .875rem;
    line-height: 1.7;
    word-break: break-word;
}

/* 段落之间给一行的间距，首尾不给：卡片自己有 padding，再叠一层就上下不对称了 */
.md :deep(> *) {
    margin: 0 0 12px;
}

.md :deep(> *:last-child) {
    margin-bottom: 0;
}

/* Release 正文里的标题层级很随意（有人从 # 起，有人从 ### 起），
   全部压到接近正文的字号，靠字重和间距分层，免得一段说明里冒出个巨大标题 */
.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
    margin: 20px 0 8px;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
}

.md :deep(h1:first-child),
.md :deep(h2:first-child),
.md :deep(h3:first-child) {
    margin-top: 0;
}

.md :deep(ul),
.md :deep(ol) {
    padding-left: 22px;
}

.md :deep(li) {
    margin: 4px 0;
}

.md :deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.md :deep(a:hover) {
    text-decoration: underline;
}

.md :deep(code) {
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(var(--v-theme-on-surface), .08);
    /* 走主题变量：scoped 的权重压过 base.css 那条，写死的话皮肤给的等宽字栈永远不生效 */
    font-family: var(--ani-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: .8125em;
}

/* 代码块里全是不折行的长命令（curl | bash），只能自己横滚，
   不然整张卡被撑宽，把关于页顶出一条横向滚动条 */
.md :deep(pre) {
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(var(--v-theme-on-surface), .06);
    overflow-x: auto;
}

.md :deep(pre code) {
    padding: 0;
    background: none;
    font-size: .8125rem;
    line-height: 1.6;
}

.md :deep(blockquote) {
    padding-left: 12px;
    border-left: 3px solid rgba(var(--v-theme-primary), .4);
    color: rgba(var(--v-theme-on-surface), .78);
}

.md :deep(hr) {
    border: 0;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 表格同理：九款界面里最窄的手机版只有 360px，写死宽度必然溢出 */
.md :deep(table) {
    display: block;
    width: max-content;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    font-size: .8125rem;
}

.md :deep(th),
.md :deep(td) {
    padding: 6px 10px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    text-align: left;
}

.md :deep(th) {
    font-weight: 600;
    background: rgba(var(--v-theme-on-surface), .04);
}
</style>
