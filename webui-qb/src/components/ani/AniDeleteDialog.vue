<script setup lang="ts">
import {ref} from 'vue'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'

const props = defineProps<{items: Ani[]}>()
const emit = defineEmits<{close: []}>()

const ani = useAniStore()
const dialog = ref(true)
const deleteFiles = ref(false)
const busy = ref(false)

async function confirm() {
  busy.value = true
  try {
    await ani.remove(props.items.map(i => i.id!).filter(Boolean), deleteFiles.value)
    dialog.value = false
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="480" @after-leave="emit('close')">
    <v-card>
      <v-card-title>删除订阅</v-card-title>
      <v-card-text>
        <p class="mb-3">
          确定删除
          <strong>{{ items.length === 1 ? items[0].title : `选中的 ${items.length} 项` }}</strong>
          ？
        </p>
        <v-list v-if="items.length > 1" class="mb-3 overflow-y-auto" density="compact" max-height="180">
          <v-list-item v-for="i in items" :key="i.id" :title="i.title" class="text-caption"/>
        </v-list>

        <!-- 删文件是不可逆的，单独一个开关并给出明确后果 -->
        <v-checkbox v-model="deleteFiles" color="error" density="compact" hide-details
                    label="同时删除已下载的文件"/>
        <v-alert v-if="deleteFiles" class="mt-3" density="compact" type="warning" variant="tonal">
          磁盘上已下载的文件会一并删除，无法撤销。
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn :loading="busy" color="error" variant="flat" @click="confirm">删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
