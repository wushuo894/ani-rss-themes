<script setup lang="ts">
/**
 * 字符串数组编辑框。
 * 后端把「匹配」「排除」「标签」「优先保留」这些都存成 List<String>，
 * 用 combobox 的多选 + chips 形态，回车即成一项，比一行一个输入框省事得多。
 */
defineProps<{label?: string; disabled?: boolean; hint?: string}>()
const model = defineModel<string[] | undefined>()
</script>

<template>
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
</template>
