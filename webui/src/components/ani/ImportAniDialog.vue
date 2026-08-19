<script setup lang="ts">
import {ref} from 'vue'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

const model = defineModel<boolean>({required: true})

const ani = useAniStore()
const ui = useUiStore()

const files = ref<File[]>([])
const filename = ref('')
const aniList = ref<Ani[]>([])
/** 与已有订阅重名时怎么办。后端 ImportAniDataDTO.Conflict 只有这两种 */
const conflict = ref<'REPLACE' | 'SKIP'>('SKIP')
const busy = ref(false)

/**
 * 文件在浏览器里解析，不走上传接口。
 * 导出的备份就是一个 JSON 数组，先读出来给用户看清有多少条、再决定冲突策略，
 * 比传上去让后端报错友好。
 */
// v-file-input 单选时给 File、多选时给 File[]，两种都要接
async function onPick(picked: File | File[]) {
  const fs = Array.isArray(picked) ? picked : picked ? [picked] : []
  const f = fs?.[0]
  aniList.value = []
  filename.value = ''
  if (!f) return

  try {
    const text = await f.text()
    const parsed = JSON.parse(text)
    const list: Ani[] = Array.isArray(parsed) ? parsed : (parsed.aniList ?? [])
    if (!Array.isArray(list) || !list.length) {
      ui.error('文件里没有可导入的订阅')
      return
    }
    aniList.value = list
    filename.value = f.name
  } catch {
    ui.error('解析失败，请确认这是 ani-rss 导出的订阅文件')
  }
}

async function submit() {
  if (!aniList.value.length) return ui.error('请先选择文件')
  busy.value = true
  try {
    await api.importAni({filename: filename.value, aniList: aniList.value, conflict: conflict.value})
    ui.success(`已导入 ${aniList.value.length} 条订阅`)
    await ani.reload()
    model.value = false
    reset()
  } finally {
    busy.value = false
  }
}

function reset() {
  files.value = []
  filename.value = ''
  aniList.value = []
}
</script>

<template>
  <v-dialog v-model="model" max-width="560" scrollable @after-leave="reset">
    <v-card>
      <v-card-title>导入订阅</v-card-title>
      <v-divider/>

      <v-card-text>
        <v-file-input
            v-model="files"
            accept=".json"
            class="mb-3"
            label="选择订阅文件"
            prepend-icon="mdi-file-document-outline"
            show-size
            @update:model-value="onPick"
        />

        <v-alert v-if="aniList.length" class="mb-4" density="compact" type="success" variant="tonal">
          已解析 <strong>{{ aniList.length }}</strong> 条订阅
        </v-alert>

        <div class="text-body-2 mb-2">与已有订阅重名时</div>
        <v-radio-group v-model="conflict" hide-details>
          <v-radio label="跳过（保留现有订阅）" value="SKIP"/>
          <v-radio label="替换（用导入的覆盖现有）" value="REPLACE"/>
        </v-radio-group>

        <v-list v-if="aniList.length" class="mt-3 overflow-y-auto" density="compact" max-height="200">
          <v-list-item v-for="(a, i) in aniList" :key="i" :subtitle="a.subgroup" :title="a.title"/>
        </v-list>
      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="model = false">取消</v-btn>
        <v-btn :disabled="!aniList.length" :loading="busy" color="primary" variant="flat" @click="submit">
          导入
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
