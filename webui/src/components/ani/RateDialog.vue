<script setup lang="ts">
import {onMounted, ref} from 'vue'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const ui = useUiStore()
const dialog = ref(true)
const loading = ref(false)
const score = ref(0)

/** 与上游一致的分档说明 */
const TEXTS = [
  '不忍直视 1（请谨慎评价）', '很差 2', '差 3', '较差 4', '不过不失 5',
  '还行 6', '推荐 7', '力荐 8', '神作 9', '超神作 10（请谨慎评价）',
]

onMounted(load)

/** score 传 null 表示「只查不改」——后端就是靠这个区分读和写的 */
async function load() {
  loading.value = true
  try {
    score.value = (await api.rate({...props.item, score: undefined})) ?? 0
  } finally {
    loading.value = false
  }
}

async function submit(v: number) {
  loading.value = true
  try {
    score.value = (await api.setRate({...props.item, score: v})) ?? 0
    ui.success(v ? `已评 ${v} 分` : '已清空评分')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="360" @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title>评分</v-card-title>
      <!--
        留白写在行内而不是 class 上：spacing.css 里那条对话框正文的 padding 选择器
        权重是四个类名，utility class 压不过它，而这里必须压过 ——
        十颗星按默认留白（24px）在手机上排不下，最后一颗会顶进右边的留白里，
        看着就是「右边没有边距、星星缺一块」。收到 12px 之后整排刚好落在里面。
      -->
      <v-card-text class="text-center" style="padding-inline: 12px">
        <div class="text-body-2 text-medium-emphasis mb-2 text-truncate">{{ item.title }}</div>
        <v-rating v-model="score" :length="10" active-color="primary" density="compact"/>
        <div class="text-caption mt-2" style="min-height: 1.5em">
          {{ score > 0 ? TEXTS[score - 1] : '未评分' }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="loading" prepend-icon="mdi-cancel" variant="text" @click="submit(0)">清空</v-btn>
        <v-spacer/>
        <v-btn variant="text" @click="dialog = false">关闭</v-btn>
        <v-btn :disabled="!score" :loading="loading" color="primary" variant="flat" @click="submit(score)">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
