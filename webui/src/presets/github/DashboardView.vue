<script setup lang="ts">
/*
 * github 这款没有总览页 —— 打开就是清单，少一次点击（meta.dashboard = false）。
 *
 * 这个文件仍然要存在：路由里 `import('@preset/DashboardView.vue')` 是静态写法，
 * 打包时会去解析它，文件缺了整个构建就失败。真被手输地址访问到就给订阅列表，
 * 不至于白屏。
 */
import SubsView from './SubsView.vue'
</script>

<template>
  <SubsView/>
</template>
