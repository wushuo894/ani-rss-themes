<script setup lang="ts">
import {ref} from 'vue'
import type {Config} from '@shared/types'
import * as api from '@shared/api'
import {formatTime} from '@shared/format'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{config: Config}>()
const ui = useUiStore()
const busy = ref(false)

async function verify() {
  if (!props.config.outTradeNo?.trim()) return ui.error('请填写订单号')
  busy.value = true
  try {
    await api.verifyNo(props.config)
    ui.success('验证成功')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <v-alert class="mb-4" density="comfortable" type="info" variant="tonal">
      ani-rss 的部分功能需要赞助后使用。此页只负责填写与校验订单号，具体政策以上游为准。
    </v-alert>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip :color="config.verifyExpirationTime ? 'error' : 'success'" variant="tonal">
        {{ config.verifyExpirationTime ? '已过期' : '有效' }}
      </v-chip>
      <v-chip v-if="config.tryOut" color="warning" variant="tonal">试用中</v-chip>
      <v-chip v-if="config.expirationTime" variant="tonal">
        到期：{{ formatTime(config.expirationTime) }}
      </v-chip>
    </div>

    <v-text-field v-model="config.outTradeNo" class="mb-3" hint="爱发电订单号" label="订单号" persistent-hint/>
    <v-btn :loading="busy" color="primary" prepend-icon="mdi-check-decagram-outline" variant="flat" @click="verify">
      验证订单
    </v-btn>

    <div class="mt-4">
      <a class="text-medium-emphasis text-caption" href="https://afdian.com/a/ani-rss" rel="noopener"
         target="_blank">前往爱发电</a>
    </div>
  </div>
</template>
