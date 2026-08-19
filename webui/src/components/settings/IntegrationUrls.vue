<script setup lang="ts">
import {computed} from 'vue'
import type {Config} from '@shared/types'
import {calendarIcsUrl, embyWebHookUrl} from '@shared/api'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{config: Config}>()
const ui = useUiStore()

/**
 * 这两个地址给外部系统长期使用，鉴权走配置里的 apiKey 而不是登录令牌 ——
 * 登录令牌会过期，贴进日历软件过几天就失效了。
 */
const rows = computed(() => {
  const key = props.config.apiKey || ''
  return [
    {label: '日历订阅 (ICS)', url: key ? calendarIcsUrl(key) : '', hint: '贴进日历软件即可看到放送表'},
    {label: 'Emby Webhook', url: key ? embyWebHookUrl(key) : '', hint: '填进 Emby 的 Webhook 插件'},
  ]
})

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    ui.success('已复制')
  } catch {
    // 非 HTTPS 或未授权时 clipboard 不可用，退回让用户手动选
    ui.warn('复制失败，请手动选中地址复制')
  }
}
</script>

<template>
  <div class="mt-2">
    <div class="text-caption text-medium-emphasis mb-2">对外地址</div>
    <v-alert v-if="!config.apiKey" density="compact" type="warning" variant="tonal">
      先在上面填写 API Key，这两个地址才可用。
    </v-alert>
    <template v-else>
      <div v-for="r in rows" :key="r.label" class="mb-3">
        <v-text-field :hint="r.hint" :label="r.label" :model-value="r.url" persistent-hint readonly>
          <template #append-inner>
            <v-btn icon="mdi-content-copy" size="small" variant="text" @click="copy(r.url)"/>
          </template>
        </v-text-field>
      </div>
    </template>
  </div>
</template>
