<script setup lang="ts">
import {computed} from 'vue'
import {externalPlayers} from '@shared/externalPlayers'

/**
 * 「用本机播放器打开」的菜单。
 * 地址怎么拼见 @shared/externalPlayers —— 那是纯函数，有断言测试盯着，
 * 因为这类拼串错了界面上完全看不出来，只有装了对应 App 的人点下去才知道。
 */
const props = defineProps<{
  src: string
  name?: string
  /** 外挂字幕地址；支持的播放器会一并带过去 */
  sub?: string
  iconOnly?: boolean
}>()

const players = computed(() => externalPlayers(props.src, props.name, props.sub))

function open(url: string) {
  window.open(url, '_self')
}
</script>

<template>
  <v-menu>
    <template #activator="{props: menuProps}">
      <v-btn
          v-bind="menuProps"
          :icon="iconOnly ? 'mdi-open-in-app' : undefined"
          :prepend-icon="iconOnly ? undefined : 'mdi-open-in-app'"
          :variant="iconOnly ? 'text' : 'tonal'"
          size="small"
          title="用本机播放器打开"
      >
        <template v-if="!iconOnly">用本机播放器打开</template>
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-subheader>用装在本机的播放器接着看</v-list-subheader>
      <v-list-item
          v-for="p in players"
          :key="p.label"
          :prepend-icon="p.icon"
          :title="p.label"
          @click="open(p.url)"
      />
      <v-divider class="my-1"/>
      <v-list-item class="text-caption text-medium-emphasis" density="compact">
        没装的点了不会有反应
      </v-list-item>
    </v-list>
  </v-menu>
</template>
