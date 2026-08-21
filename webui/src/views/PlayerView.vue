<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {buildPlayUrl, isPlayerDeployed, PLAYER_DIR} from '@shared/player'
import ExternalPlayerMenu from '@/components/player/ExternalPlayerMenu.vue'

const route = useRoute()
const router = useRouter()

const ready = ref<boolean | null>(null)

const src = computed(() => String(route.query.src || ''))
const title = computed(() => String(route.query.title || ''))
/* 转本机播放器时把同一条字幕一起带过去，不然换个播放器就没字幕了 */
const suburl = computed(() => (route.query.suburl ? String(route.query.suburl) : undefined))

const playUrl = computed(() => buildPlayUrl({
  url: src.value,
  title: title.value,
  suburl: suburl.value,
  sublabel: route.query.sublabel ? String(route.query.sublabel) : undefined,
}))

onMounted(async () => {
  ready.value = src.value ? await isPlayerDeployed() : false
})

function back() {
  if (window.history.length > 1) router.back()
  else void router.replace('/')
}
</script>

<template>
  <div class="play-page">
    <!-- 播放页自己有完整界面，我们只给一条极窄的返回栏，别再套一层壳 -->
    <div class="bar">
      <v-btn icon="mdi-arrow-left" size="small" variant="text" @click="back"/>
      <div class="title text-truncate">{{ title || '播放' }}</div>
      <v-spacer/>
      <ExternalPlayerMenu v-if="src" :name="title" :src="src" :sub="suburl"/>
    </div>

    <div v-if="ready === null" class="hint">
      <v-progress-circular indeterminate size="28"/>
    </div>

    <div v-else-if="!src" class="hint">
      <v-empty-state icon="mdi-video-off" text="没有指定要播放的文件" title="缺少参数"/>
    </div>

    <!--
      allow 里这几项缺一不可：fullscreen 是全屏按钮，picture-in-picture 是画中画，
      autoplay 让它能自己起播，encrypted-media 留给将来可能的加密流。
      不加 sandbox：同源、且它需要 localStorage 记住音量与字幕偏好。
    -->
    <iframe
        v-else-if="ready"
        :src="playUrl"
        :title="title"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowfullscreen
        class="frame"
    />

    <div v-else class="hint pa-6">
      <v-alert class="mx-auto" max-width="560" type="warning" variant="tonal">
        <div class="text-subtitle-2 mb-2">没有找到播放器</div>
        <div class="text-body-2 mb-3">
          在线播放用的是 <a href="https://github.com/zzzwannasleep/webplayer" rel="noopener" target="_blank">webplayer</a>，
          它是一个独立的静态站，需要和本界面放在一起：
        </div>
        <pre class="cmd">{configDir}/webui/{{ PLAYER_DIR }}/play.html</pre>
        <div class="text-body-2 mt-3">
          在 webplayer 仓库里 <code>npm run build</code>，把它的 <code>dist/</code> 整个复制成
          <code>webui/{{ PLAYER_DIR }}/</code> 即可。
        </div>
        <div class="text-caption text-medium-emphasis mt-3">
          不装也能用：右上角「用本机播放器打开」把地址交给 PotPlayer / VLC / MPV 等。
        </div>
      </v-alert>
    </div>
  </div>
</template>

<style scoped>
.play-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    /* 手机上地址栏收起前后 vh 不变，播放器会被顶出屏幕露不出底部控件 */
    height: 100dvh;
    background: #000;
}

.bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    /* 播放页是深色的，这条栏跟着它走，不跟随主题，免得亮色主题下夹一条白边 */
    background: #0a0c0f;
    color: #e8ecf1;
    padding-top: calc(4px + env(safe-area-inset-top));
}

.title {
    font-size: .875rem;
    min-width: 0;
}

.frame {
    flex: 1 1 auto;
    width: 100%;
    border: 0;
    display: block;
}

.hint {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(var(--v-theme-background));
}

.cmd {
    font-family: var(--ani-font-mono, ui-monospace, Menlo, Consolas, monospace);
    font-size: .8125rem;
    background: rgba(128, 128, 128, .15);
    padding: 6px 8px;
    border-radius: 4px;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
}
</style>
