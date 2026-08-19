<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Config, NotificationConfig} from '@shared/types'
import * as api from '@shared/api'
import {useUiStore} from '@/stores/ui'
import StringListField from '@/components/common/StringListField.vue'
import {N_FIELDS, N_STATUS, N_TYPES, type NType} from './notificationSchema'

const props = defineProps<{item: NotificationConfig; config: Config}>()
const emit = defineEmits<{close: []}>()

const ui = useUiStore()
const {mobile} = useDisplay()
const dialog = ref(true)
const busy = ref('')

const fields = computed(() => N_FIELDS[(props.item.notificationType || 'TELEGRAM') as NType] || [])

/** 同 SettingField：把 any 收敛在一处，外面保持有类型 */
function get(k: string) {
  return (props.item as Record<string, unknown>)[k]
}

function set(k: string, v: unknown) {
  (props.item as Record<string, unknown>)[k] = v
}

/** Telegram：拉取最近会话，省得用户自己去查 chat id */
async function fetchTgChats() {
  busy.value = 'tg'
  try {
    const chats = await api.getTgUpdates(props.item)
    if (!chats?.length) return ui.warn('没拉到会话，先给机器人发一条消息再试')
    // 后端返回的是 Chat 列表，取第一个填进去；多个时提示用户自行选择
    const first = chats[0] as {id?: number | string; title?: string; username?: string}
    if (first?.id !== undefined) {
      set('telegramChatId', String(first.id))
      ui.success(`已填入：${first.title || first.username || first.id}`)
    }
  } finally {
    busy.value = ''
  }
}

/** Emby：拉取媒体库列表 */
async function fetchEmbyViews() {
  busy.value = 'emby'
  try {
    const views = await api.getEmbyViews(props.config)
    const items = (views as {items?: {id?: string; name?: string}[]})?.items || []
    if (!items.length) return ui.warn('没有取到媒体库')
    ui.info(`可用媒体库：${items.map(v => `${v.name}(${v.id})`).join('、')}`)
  } finally {
    busy.value = ''
  }
}

async function test() {
  busy.value = 'test'
  try {
    await api.testNotification(props.item)
    ui.success('已发送测试通知')
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="640" scrollable @after-leave="emit('close')">
    <v-card>
      <v-card-title class="d-flex align-center">
        通知设置
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text>
        <v-text-field v-model="item.comment" class="mb-3" hint="给这个渠道起个名字，便于在列表里区分"
                      label="备注" persistent-hint/>

        <v-select
            v-model="item.notificationType"
            :items="N_TYPES.map(t => ({title: t.title, value: t.value}))"
            class="mb-3"
            label="类型"
        />

        <v-select
            v-model="item.statusList"
            :items="N_STATUS"
            chips
            class="mb-3"
            closable-chips
            hint="不选则任何事件都不会通知"
            label="触发时机"
            multiple
            persistent-hint
        />

        <v-text-field v-model.number="item.retry" class="mb-3" label="失败重试次数" min="0" type="number"/>

        <v-textarea v-model="item.notificationTemplate" auto-grow class="mb-4"
                    hint="留空则使用上面的全局模版" label="消息模版" persistent-hint rows="2"/>

        <v-divider class="mb-4"/>

        <!-- 按类型渲染各自的字段 -->
        <template v-for="f in fields" :key="f.key">
          <div v-if="f.type === 'switch'" class="d-flex align-center py-1 mb-2">
            <div class="flex-grow-1 pr-4">
              <div class="text-body-2">{{ f.label }}</div>
              <div v-if="f.hint" class="text-caption text-medium-emphasis">{{ f.hint }}</div>
            </div>
            <v-switch :model-value="!!get(f.key)" color="primary" density="compact" hide-details
                      @update:model-value="v => set(f.key, !!v)"/>
          </div>

          <StringListField v-else-if="f.type === 'list'" :hint="f.hint" :label="f.label"
                           :model-value="(get(f.key) as string[] | undefined)" class="mb-3"
                           @update:model-value="v => set(f.key, v)"/>

          <v-textarea v-else-if="f.type === 'textarea'" :hint="f.hint" :label="f.label"
                      :model-value="(get(f.key) as string | undefined)" auto-grow class="mb-3"
                      persistent-hint rows="3" @update:model-value="v => set(f.key, v)"/>

          <v-select v-else-if="f.type === 'select'" :hint="f.hint" :items="f.items" :label="f.label"
                    :model-value="get(f.key)" class="mb-3" persistent-hint
                    @update:model-value="v => set(f.key, v)"/>

          <v-text-field v-else-if="f.type === 'number'" :hint="f.hint" :label="f.label"
                        :model-value="get(f.key)" class="mb-3" persistent-hint type="number"
                        @update:model-value="v => set(f.key, v === '' ? undefined : Number(v))"/>

          <v-text-field v-else :hint="f.hint" :label="f.label" :model-value="(get(f.key) as string | undefined)"
                        :type="f.type === 'password' ? 'password' : 'text'" autocomplete="off" class="mb-3"
                        persistent-hint @update:model-value="v => set(f.key, v)"/>
        </template>

        <!-- 类型专属的辅助按钮 -->
        <v-btn v-if="item.notificationType === 'TELEGRAM'" :loading="busy === 'tg'" prepend-icon="mdi-refresh"
               variant="tonal" @click="fetchTgChats">
          获取会话 ID
        </v-btn>
        <v-btn v-if="item.notificationType === 'EMBY_REFRESH'" :loading="busy === 'emby'" prepend-icon="mdi-refresh"
               variant="tonal" @click="fetchEmbyViews">
          获取媒体库
        </v-btn>
      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <v-btn :loading="busy === 'test'" prepend-icon="mdi-send-check-outline" variant="text" @click="test">
          发送测试
        </v-btn>
        <v-spacer/>
        <!-- 改动直接落在 config 对象上，靠外层设置页统一保存，这里只是关闭 -->
        <v-btn color="primary" variant="flat" @click="dialog = false">完成</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
