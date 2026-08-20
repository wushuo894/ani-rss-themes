<script setup lang="ts">
import {computed, ref} from 'vue'
import type {Config} from '@shared/types'
import type {FieldDef} from './schema'
import StringListField from '@/components/common/StringListField.vue'

const props = defineProps<{config: Config; def: FieldDef}>()

/**
 * 按 key 读写 Config。
 * Config 有 121 个字段、类型各异，逐个做联合类型收益极低，
 * 所以把 any 收敛在这一个 computed 里，外面全部是有类型的。
 */
const value = computed({
  get: () => (props.config as Record<string, unknown>)[props.def.key],
  set: v => {
    (props.config as Record<string, unknown>)[props.def.key] = v
  },
})

const disabled = computed(() => !!props.def.disabledWhen?.(props.config))
const warn = computed(() => props.def.warn?.(props.config) || '')

/* 密码类字段默认打码，但要能点开看一眼 —— ApiKey / token 这些粘进去之后
   看不见内容，粘错了只能等到「测试」失败才知道 */
const reveal = ref(false)
</script>

<template>
  <div>
  <!-- 开关单独一行，标签在左、控件在右，比把开关塞进表单栅格里更好扫读 -->
  <div v-if="def.type === 'switch'" class="d-flex align-center py-1">
    <div class="flex-grow-1 pr-4">
      <div class="text-body-2">{{ def.label }}</div>
      <div v-if="def.hint" class="text-caption text-medium-emphasis">{{ def.hint }}</div>
    </div>
    <v-switch
        :disabled="disabled"
        :model-value="!!value"
        color="primary"
        density="compact"
        hide-details
        @update:model-value="v => value = !!v"
    />
  </div>

  <StringListField
      v-else-if="def.type === 'list'"
      :disabled="disabled"
      :hint="def.hint"
      :label="def.label"
      :model-value="(value as string[] | undefined)"
      class="mb-3"
      @update:model-value="v => value = v"
  />

  <v-textarea
      v-else-if="def.type === 'textarea'"
      :disabled="disabled"
      :hint="def.hint"
      :label="def.label"
      :model-value="(value as string | undefined)"
      :placeholder="def.placeholder"
      auto-grow
      class="mb-3"
      persistent-hint
      rows="3"
      @update:model-value="v => value = v"
  />

  <v-select
      v-else-if="def.type === 'select'"
      :disabled="disabled"
      :hint="def.hint"
      :items="def.items"
      :label="def.label"
      :model-value="value"
      class="mb-3"
      persistent-hint
      @update:model-value="v => value = v"
  />

  <v-text-field
      v-else-if="def.type === 'number'"
      :disabled="disabled"
      :hint="def.hint"
      :label="def.label"
      :max="def.max"
      :min="def.min"
      :model-value="value"
      :suffix="def.suffix"
      class="mb-3"
      persistent-hint
      type="number"
      @update:model-value="v => value = v === '' ? undefined : Number(v)"
  />

  <v-text-field
      v-else
      :disabled="disabled"
      :hint="def.hint"
      :label="def.label"
      :model-value="(value as string | undefined)"
      :placeholder="def.placeholder"
      :append-inner-icon="def.type === 'password' ? (reveal ? 'mdi-eye-off' : 'mdi-eye') : undefined"
      :type="def.type === 'password' && !reveal ? 'password' : 'text'"
      autocomplete="off"
      class="mb-3"
      persistent-hint
      @click:append-inner="reveal = !reveal"
      @update:model-value="v => value = v"
  />

  <!-- 值本身是合法的，只是很可能不是用户想要的 —— 不拦，只提醒 -->
  <v-alert v-if="warn" class="mb-3 mt-n1" density="compact" icon="mdi-alert-outline"
           type="warning" variant="tonal">
    <span class="text-caption">{{ warn }}</span>
  </v-alert>
  </div>
</template>
