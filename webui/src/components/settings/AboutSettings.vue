<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import type {About, UpdateInfo} from '@shared/types'
import * as api from '@shared/api'
import {ApiError, getBaseUrl} from '@shared/http'
import {fetchLatest, readWebuiMeta, type WebuiLatest} from '@shared/github'
import {formatSize} from '@shared/format'
import {renderMarkdown} from '@shared/markdown'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'
import {pickedFile} from '@/composables/pickedFile'
import presetMeta from '@preset/meta'

const store = useConfigStore()
const ui = useUiStore()

const info = ref<About | null>(null)
const loading = ref(false)
const busy = ref('')
const confirmStop = ref<number | null>(null)
const confirmRestore = ref(false)
/** 要换上去的界面包。单选时 v-file-input 给的是 File 本身，不是数组，所以经 pickedFile 取 */
const pkg = ref<File | File[] | null>(null)

/* 这套界面自己的版本号：构建期注入，和发布包里 webui.json 的 version 同一个数 ——
   后端就是拿那个数跟 Release 的 tag 比来判断有没有新版的 */
const WEBUI_VERSION = __VERSION__
/** 后端返回的 UpdateInfo。About 现在就是 `UpdateInfo + version`，两边字段天然对得上 */
const webui = ref<UpdateInfo | null>(null)

/*
 * 后端那条更新检查的状态。原来只有一个布尔 webuiSupported，把两种完全不同的情况
 * 混成了同一句「当前 ani-rss 不支持在线更新界面」：
 *
 *   unsupported  真没有 /api/webui/*（3.2.16 以前），那句话是对的
 *   broken       有这两个端点，但后端找不到 config/webui/webui.json，于是一律回
 *                「无 WebUI 更新」。这种机器往往**是支持**换界面的，说成「不支持」等于把人劝走。
 *                见过两种：镜像是那版把路径多找了一级的 3.2.17（上游 81f43b5 已修），
 *                或者 config/webui/ 是自己攒的、没放 webui.json。
 */
const webuiCheck = ref<'ok' | 'unsupported' | 'broken'>('ok')
/** 后端查不动时，自己拿装着的这份 webui.json 去 GitHub 问一次 */
const fallback = ref<WebuiLatest | null>(null)
/** 备胎也没查到时是卡在哪一步：meta = 包里没有 webui.json，net = GitHub 没问到 */
const fallbackFail = ref<'meta' | 'net' | null>(null)

/*
 * 后端查得动的时候，「手动下载」只是给不想让服务器去下的人留的一条小路（文字按钮）；
 * 查不动的时候它就是主按钮 —— 更新只能走「下载下来再传上去」这一条路，得说清楚下的是什么。
 */
const downloadLabel = computed(() =>
    webuiCheck.value === 'broken' ? `下载 ${webuiInfo.value?.latest} 的包` : '手动下载')

/* 两颗按钮都藏起来时别留一个空的 flex 行在那儿 —— 它自带 mb-4，看着就是凭空多出一段空白。
   后端查不动而且已经是最新版时就是这种情况：同一个包再下一遍没有意义。 */
const showWebuiActions = computed(() => webuiCheck.value === 'ok'
    ? !!(webuiInfo.value?.update || webuiInfo.value?.downloadUrl)
    : webuiCheck.value === 'broken' && !!webuiInfo.value?.update && !!webuiInfo.value?.downloadUrl)

/* 两条路查出来的字段是对得上的，合成一个给下面的卡片用 ——
   不然版本号、发布时间、更新内容每一处都要写两遍 */
const webuiInfo = computed<UpdateInfo | null>(() => webui.value ?? (fallback.value ? {
  latest: fallback.value.latest,
  update: fallback.value.update,
  downloadUrl: fallback.value.downloadUrl,
  size: fallback.value.size,
  markdownBody: fallback.value.markdownBody,
  date: fallback.value.date,
} : null))

/* 两段更新说明都是 Markdown。渲染器自己先把整段转义成纯文本再拼标签，所以 v-html 是安全的 */
const aniRssNotes = computed(() => renderMarkdown(info.value?.markdownBody ?? ''))
const webuiNotes = computed(() => renderMarkdown(webuiInfo.value?.markdownBody ?? ''))

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
    webuiCheck.value = 'ok'
    fallback.value = null
    return
  } catch (e) {
    webui.value = null
    webuiCheck.value = notSupported(e) ? 'unsupported' : 'broken'
  }

  /* 后端查不动，自己查。只查版本不下载 ——
     GitHub 的发布资产不带 CORS 头，浏览器 fetch 不下来，下载得让用户点链接。 */
  const meta = await readWebuiMeta(getBaseUrl())
  fallback.value = meta ? await fetchLatest(meta) : null
  fallbackFail.value = fallback.value ? null : (meta ? 'net' : 'meta')
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

/*
 * 换界面 / 还原自带界面。这两个端点是 3.2.17 才有的。
 *
 * 不跟着更新检查那块一起藏：两件事的前提不一样 —— 更新检查要读得到 webui.json，
 * 换界面不用。有过一版 3.2.17 的构建正是「更新检查坏了但换界面好使」，
 * 跟着藏的话按钮恰好在最需要它的那种机器上看不见。老版本就让它 404，按错误码说人话。
 */
function notSupported(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 404 || e.code === 405)
}

/*
 * 换界面前先把 service worker 连缓存一起卸掉。
 * main.ts 在正式产物里注册了一个 sw.js：整套文件被后端换掉之后，它还挂在这个源上继续拦请求，
 * 断网时会拿我们缓存的 index.html 顶替新界面 —— 换都换了还被旧界面糊一脸。
 * 只有「整套换掉」才需要这么做，同一款界面的版本更新不用（资源名带哈希，自然不撞）。
 */
async function dropServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch {
    // 卸不掉也不该挡着刷新，大不了下一次网络优先取回来
  }
}

/** 后端 spring.servlet.multipart.max-file-size 是 50MB，超了 Tomcat 直接回一段 HTML，
    接口层只能报「服务端返回了非 JSON 内容」—— 不如在这儿说清楚 */
const MAX_PKG_SIZE = 50 * 1024 * 1024

async function doWebuiUpload() {
  const f = pickedFile(pkg.value)
  if (!f) return ui.error('请先选择界面压缩包')
  if (!f.name.toLowerCase().endsWith('.zip')) return ui.error('只认 zip 压缩包')
  if (f.size > MAX_PKG_SIZE) return ui.error('压缩包超过 50MB，后端不收')

  busy.value = 'upload'
  try {
    await api.webuiUpload(f)
    pkg.value = null
    ui.success('界面已替换，正在重新加载')
    await dropServiceWorker()
    setTimeout(() => location.reload(), 1200)
  } catch (e) {
    ui.error(notSupported(e)
        ? '当前 ani-rss 不支持在网页里换界面，需要 3.2.17 及以上'
        : (e as Error).message || '上传失败')
  } finally {
    busy.value = ''
  }
}

async function doWebuiRestore() {
  busy.value = 'restore'
  try {
    await api.webuiDelete()
    ui.success('已还原自带界面，正在重新加载')
    await dropServiceWorker()
    setTimeout(() => location.reload(), 1200)
  } catch (e) {
    ui.error(notSupported(e)
        ? '当前 ani-rss 不支持在网页里还原界面，需要 3.2.17 及以上'
        : (e as Error).message || '还原失败')
  } finally {
    busy.value = ''
    confirmRestore.value = false
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
          <v-chip v-if="webuiInfo?.update" color="warning" size="small" variant="tonal">
            有新版本 {{ webuiInfo.latest }}
          </v-chip>
          <v-chip v-else-if="webuiInfo" color="success" size="small" variant="tonal">已是最新</v-chip>
          <!-- 这一版是自己去 GitHub 查的，跟后端查的不是一回事，得让人看得出来 -->
          <v-chip v-if="fallback" size="x-small" variant="text">来自 GitHub</v-chip>
        </div>

        <!-- 真没有这两个端点（3.2.16 以前） -->
        <div v-if="webuiCheck === 'unsupported'" class="text-caption text-medium-emphasis">
          当前 ani-rss 不支持在线更新界面，去 Releases 下压缩包解压到 config/webui/ 覆盖即可。
        </div>

        <!-- 有端点但后端找不到 webui.json。这种机器往往是支持换界面的，
             别把人劝去 SSH —— 备胎查得到就照常显示新版本，下载下来传上去一样能更新 -->
        <div v-else-if="webuiCheck === 'broken'" class="text-caption text-medium-emphasis mb-1">
          后端没在 <code>config/webui/</code> 里读到 <code>webui.json</code>，更新检查用不了 ——
          有一版 3.2.17 的构建把它多找了一级（<code>config/webui/webui/</code>）。
          <template v-if="fallback">上面这版是本界面自己去 GitHub 问来的。</template>
          <template v-else-if="fallbackFail === 'meta'">
            而且这份界面的目录里没有 <code>webui.json</code>，两边都无从比起 —— 去 Releases 下一个完整的包。
          </template>
          <template v-else>GitHub 也没问到（限流或者网络不通），过一会儿再看。</template>
          升级一下 ani-rss 就好（作者已经改回来了，同一个版本号重新推的，镜像重新拉一次）。
          在那之前，下载下来用下面的「上传并切换」照样能更新界面。
        </div>

        <template v-if="webuiCheck !== 'unsupported'">
          <div v-if="webuiInfo?.date" class="text-caption text-medium-emphasis">发布时间：{{ webuiInfo.date }}</div>
          <div v-if="webuiInfo?.size" class="text-caption text-medium-emphasis">
            压缩包：{{ webuiInfo.formatSize || formatSize(webuiInfo.size) }}
          </div>
          <!-- 更新是「删掉整个 webui 目录再解压」，放进去的额外文件会一起没 -->
          <div v-if="webuiInfo?.update" class="text-caption text-medium-emphasis">
            更新会先清空 config/webui/ 再解压，自己往里放过的文件请先备份。
          </div>
        </template>
      </v-card-text>
    </v-card>

    <div v-if="showWebuiActions" class="d-flex flex-wrap ga-2 mb-4">
      <!-- 后端那条路能用才给这颗：下载解压都在服务器上跑，认代理也认 githubToken -->
      <v-btn v-if="webuiCheck === 'ok' && webuiInfo?.update" :loading="busy === 'webui'" color="primary"
             prepend-icon="mdi-download" variant="flat" @click="doWebuiUpdate">
        更新界面到 {{ webuiInfo.latest }}
      </v-btn>
      <!-- 后端查不动时这颗就是主按钮：浏览器下不了这个包（GitHub 的发布资产不带 CORS 头），
           只能让浏览器自己去下，下完在下面那张卡里传上来 -->
      <v-btn v-if="webuiInfo?.downloadUrl && (webuiCheck === 'ok' || webuiInfo.update)"
             :color="webuiCheck === 'broken' ? 'primary' : undefined"
             :href="webuiInfo.downloadUrl" :variant="webuiCheck === 'broken' ? 'flat' : 'text'"
             prepend-icon="mdi-open-in-new" target="_blank">
        {{ downloadLabel }}
      </v-btn>
    </div>

    <!--
      不要求 `update` 为真才显示。原来卡在这个条件上：版本号长期不涨（见 workflow 里
      跟着 run_number 走的那段），`update` 永远是 false，这张卡就一次都没露过面 ——
      于是页面上唯一看得见的「更新内容」是 ani-rss 那一段，看着就像界面在拿别人的更新充数。
      已经是最新版时看一眼这一版改了什么，本来也是正当需求。
    -->
    <v-card v-if="webuiInfo?.markdownBody" class="mb-4" variant="flat">
      <v-card-title class="d-flex align-center ga-2 text-subtitle-2">
        <span>{{ presetMeta.name }} WebUI 更新内容</span>
        <v-chip v-if="webuiInfo.latest" size="x-small" variant="tonal">{{ webuiInfo.latest }}</v-chip>
      </v-card-title>
      <v-divider/>
      <v-card-text>
        <div class="md" v-html="webuiNotes"/>
      </v-card-text>
    </v-card>

    <!-- 换界面：传一个包上去就换成别的，或者整个删掉退回 ani-rss 自带的那套。
         不藏在 webuiSupported 后面，理由见 script 里 notSupported 上面那段。 -->
    <v-card class="mb-4" variant="flat">
      <v-card-title class="text-subtitle-2">更换界面</v-card-title>
      <v-divider/>
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-3">
          选一个界面压缩包传上去就换成它，zip 的根目录里要有 <code>webui.json</code>（本仓库九个包都是）。
          上传会先清空 <code>config/webui/</code>，自己往里放过的文件请先备份。
          需要 ani-rss 3.2.17 及以上。
        </div>

        <v-file-input
            v-model="pkg"
            accept=".zip"
            class="mb-3"
            density="comfortable"
            label="选择界面压缩包"
            prepend-icon="mdi-folder-zip-outline"
            show-size
        />

        <div class="d-flex flex-wrap ga-2">
          <v-btn :disabled="!pickedFile(pkg)" :loading="busy === 'upload'" color="primary"
                 prepend-icon="mdi-upload" variant="flat" @click="doWebuiUpload">
            上传并切换
          </v-btn>
          <v-btn :loading="busy === 'restore'" color="error" prepend-icon="mdi-backup-restore"
                 variant="tonal" @click="confirmRestore = true">
            还原自带界面
          </v-btn>
        </div>
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

    <v-dialog v-model="confirmRestore" max-width="400">
      <v-card>
        <v-card-title>还原自带界面</v-card-title>
        <v-card-text>
          <p class="mb-0">
            会删掉整个 <code>config/webui/</code>，网页立刻退回 ani-rss 自带的那套界面。
          </p>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            想换回来再传一次包就行。ani-rss 3.2.16 以下改完要重启才生效，不是刷新。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="confirmRestore = false">取消</v-btn>
          <v-btn :loading="busy === 'restore'" color="error" variant="flat" @click="doWebuiRestore">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
 * 一律用 :deep(.md xxx) 收口在这张卡里，别写成全局的 h2/li —— 那会波及十一款皮肤的所有页面。
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

/* 表格同理：十一款界面里最窄的手机版只有 360px，写死宽度必然溢出 */
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
