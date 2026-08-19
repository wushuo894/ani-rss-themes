<script setup lang="ts">
import {ref} from 'vue'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import {toApiFile} from '@shared/http'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const ani = useAniStore()
const ui = useUiStore()
const dialog = ref(true)
const busy = ref(false)
/** 重新拉取后封面路径不变，靠这个参数打破浏览器缓存 */
const bust = ref(Date.now())

async function refresh() {
  busy.value = true
  try {
    await api.refreshCover(props.item)
    ui.success('封面已刷新')
    bust.value = Date.now()
    await ani.reload()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="420" @after-leave="emit('close')">
    <v-card>
      <v-card-title class="text-truncate">{{ item.title }}</v-card-title>
      <v-card-text class="text-center">
        <v-img
            :src="item.cover ? `${toApiFile(item.cover)}&_=${bust}` : ''"
            aspect-ratio="0.7"
            class="mx-auto rounded"
            max-width="260"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="dialog = false">关闭</v-btn>
        <v-btn :loading="busy" color="primary" prepend-icon="mdi-refresh" variant="flat" @click="refresh">
          重新抓取封面
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
