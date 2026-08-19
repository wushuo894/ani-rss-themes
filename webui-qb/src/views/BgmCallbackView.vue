<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import type {BgmMe} from '@shared/types'
import * as api from '@shared/api'

const route = useRoute()
const state = ref<'pending' | 'ok' | 'fail'>('pending')
const message = ref('正在完成授权…')
const me = ref<BgmMe | null>(null)

onMounted(async () => {
  /*
   * Bangumi 会把 code 带回来。注意这里同时看 query 和 hash 里的 query：
   * 本 WebUI 走 hash 路由，而 OAuth 回调地址通常配的是不带 hash 的地址，
   * 两种落法都要能接住。
   */
  const fromHash = new URLSearchParams(location.hash.split('?')[1] || '')
  const code = (route.query.code as string) || fromHash.get('code') || ''

  if (!code) {
    state.value = 'fail'
    message.value = '回调地址里没有 code，授权未完成。'
    return
  }

  try {
    await api.bgmOauthCallback(code)
    me.value = await api.meBgm({})
    state.value = 'ok'
    message.value = '授权成功，可以关闭本页了。'
  } catch (e) {
    state.value = 'fail'
    message.value = e instanceof Error ? e.message : '授权失败'
  }
})
</script>

<template>
  <v-main>
    <v-container class="fill-height d-flex align-center justify-center">
      <v-card max-width="440" width="100%">
        <v-card-title>Bangumi 授权</v-card-title>
        <v-divider/>

        <v-card-text>
          <div v-if="state === 'pending'" class="d-flex align-center ga-3">
            <v-progress-circular indeterminate size="24"/>
            <span>{{ message }}</span>
          </div>

          <template v-else>
            <v-alert :type="state === 'ok' ? 'success' : 'error'" class="mb-4" density="comfortable" variant="tonal">
              {{ message }}
            </v-alert>

            <div v-if="me" class="d-flex align-center ga-3">
              <v-avatar size="56">
                <v-img :src="me.avatar?.large || me.avatar?.medium"/>
              </v-avatar>
              <div class="min-w-0">
                <div class="text-body-1">{{ me.username || me.id }}</div>
                <div class="text-caption text-medium-emphasis text-truncate">{{ me.url }}</div>
                <v-chip v-if="me.expiresDays !== undefined" :color="me.expiresDays > 3 ? 'success' : 'error'"
                        class="mt-1" size="x-small" variant="tonal">
                  剩余 {{ me.expiresDays }} 天
                </v-chip>
              </div>
            </div>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-spacer/>
          <v-btn to="/settings/basic" variant="text">返回设置</v-btn>
        </v-card-actions>
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped>
.min-w-0 {
    min-width: 0;
}
</style>
