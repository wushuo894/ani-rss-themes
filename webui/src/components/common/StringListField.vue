<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Config} from '@shared/types'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'

/**
 * 字符串数组编辑框。
 * 后端把「匹配」「排除」「标签」「优先保留」这些都存成 List<String>，
 * 用 combobox 的多选 + chips 形态，回车即成一项，比一行一个输入框省事得多。
 *
 * 上游在「排除」和「优先保留」两处还各挂了一颗「从全局导入」和一颗「清空」——
 * 全局排除通常已经攒了十几条（720、简、CHT 之类），单条订阅要在它基础上再加，
 * 没有这颗按钮就得一条条照抄。传 importKey 就长出来。
 */
const props = defineProps<{
  label?: string
  disabled?: boolean
  hint?: string
  /** 设了就显示「导入全局」，值是 Config 上对应的那个数组字段 */
  importKey?: 'exclude' | 'priorityKeywords'
  /** 说明文字下面的文档链接 */
  doc?: {text: string; href: string}
}>()
const model = defineModel<string[] | undefined>()

const config = useConfigStore()
const ui = useUiStore()
const loading = ref(false)
const count = computed(() => model.value?.length ?? 0)

/** 合并而不是覆盖：这一栏里本来就有的是用户自己加的，导入不该把它们冲掉 */
async function importGlobal() {
  const key = props.importKey
  if (!key) return
  loading.value = true
  try {
    const c = await config.load()
    const from = (c as Config)[key] as string[] | undefined
    if (!from?.length) return ui.warn('全局那份是空的')
    const cur = model.value ?? []
    const added = from.filter(x => !cur.includes(x))
    if (!added.length) return ui.info('全局那几条都已经在了')
    model.value = [...cur, ...added]
    ui.success(`导入了 ${added.length} 条`)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <v-combobox
        :disabled="disabled"
        :hint="hint"
        :label="label"
        :model-value="model ?? []"
        chips
        closable-chips
        multiple
        persistent-hint
        @update:model-value="v => model = (v as string[]).filter(s => s !== '')"
    />
    <div v-if="importKey || count" class="d-flex align-center flex-wrap ga-2 mt-2">
      <v-btn v-if="importKey" :disabled="disabled" :loading="loading" prepend-icon="mdi-tray-arrow-down"
             size="small" variant="tonal" @click="importGlobal">
        导入全局
      </v-btn>
      <v-btn v-if="count" :disabled="disabled" prepend-icon="mdi-close-circle-outline" size="small"
             variant="text" @click="model = []">
        清空
      </v-btn>
      <a v-if="doc" :href="doc.href" class="text-caption doc-link" rel="noopener" target="_blank">
        {{ doc.text }}
        <v-icon icon="mdi-open-in-new" size="12"/>
      </a>
    </div>
  </div>
</template>

<style scoped>
.doc-link {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}

.doc-link:hover {
    text-decoration: underline;
}
</style>
