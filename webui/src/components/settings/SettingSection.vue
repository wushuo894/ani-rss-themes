<script setup lang="ts">
import {computed} from 'vue'
import type {Config} from '@shared/types'
import type {SectionDef} from './schema'
import SettingField from './SettingField.vue'

const props = defineProps<{config: Config; section: SectionDef}>()

/** when 不满足的项整条不渲染（比如非 OpenList 时不显示 Driver） */
const visible = computed(() => props.section.fields.filter(f => !f.when || f.when(props.config)))
</script>

<template>
  <div>
    <div v-if="section.note" class="text-caption text-medium-emphasis mb-3">{{ section.note }}</div>
    <SettingField
        v-for="(f, i) in visible"
        :key="`${f.key}-${i}`"
        :config="config"
        :def="f"
    />
    <slot/>
  </div>
</template>
