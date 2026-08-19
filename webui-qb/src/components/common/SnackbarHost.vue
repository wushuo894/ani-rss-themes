<script setup lang="ts">
import {useUiStore} from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <!-- 多条提示要能叠着显示，v-snackbar 单例做不到，所以自己排一列 -->
  <div class="snackbar-host">
    <v-slide-y-reverse-transition group>
      <v-alert
          v-for="t in ui.toasts"
          :key="t.id"
          :type="t.color"
          class="mb-2 elevation-4"
          closable
          density="comfortable"
          @click:close="ui.dismiss(t.id)"
      >
        {{ t.text }}
      </v-alert>
    </v-slide-y-reverse-transition>
  </div>
</template>

<style scoped>
.snackbar-host {
    position: fixed;
    /* 贴底居中；env() 是为了避开 iPhone 底部横条 */
    bottom: calc(16px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    z-index: 3000;
    width: min(480px, calc(100vw - 32px));
    pointer-events: none;
}

.snackbar-host > * {
    pointer-events: auto;
}
</style>
