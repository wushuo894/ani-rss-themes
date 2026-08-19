<script setup lang="ts">
import {ref} from 'vue'
import * as api from '@shared/api'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'

const store = useConfigStore()
const ui = useUiStore()
const file = ref<File[]>([])
const busy = ref('')

async function doImport() {
  const f = file.value?.[0]
  if (!f) return ui.error('请先选择备份文件')
  busy.value = 'import'
  try {
    await api.importConfig(f)
    ui.success('导入完成，正在重新读取配置')
    await store.load(true)
    file.value = []
  } finally {
    busy.value = ''
  }
}

async function doClearCache() {
  busy.value = 'cache'
  try {
    await api.clearCache()
    ui.success('缓存已清理')
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-3">
      导出的是一份 zip，包含全部设置与订阅。导入会覆盖当前配置。
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <!-- 导出走浏览器直接下载，令牌在查询串里（这类请求设不了请求头） -->
      <v-btn :href="api.exportConfigUrl()" prepend-icon="mdi-upload" target="_blank" variant="tonal">
        导出设置
      </v-btn>
      <v-btn :loading="busy === 'cache'" prepend-icon="mdi-broom" variant="tonal" @click="doClearCache">
        清理缓存
      </v-btn>
    </div>

    <v-file-input
        v-model="file"
        accept=".zip"
        class="mb-3"
        density="comfortable"
        label="选择备份文件"
        prepend-icon="mdi-folder-zip-outline"
        show-size
    />
    <v-btn :disabled="!file?.length" :loading="busy === 'import'" color="primary"
           prepend-icon="mdi-download" variant="flat" @click="doImport">
      导入设置
    </v-btn>
  </div>
</template>
