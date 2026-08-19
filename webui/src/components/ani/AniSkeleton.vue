<script setup lang="ts">
/**
 * 骨架屏占位。
 *
 * 形状必须跟真实内容对上 —— 海报是竖的、行是横的、宽卡是左图右文；
 * 形状对不上的话数据回来那一刻整页会跳一下，比没有占位符还难受。
 *
 * 只画形状，不画容器：调用方把它塞进自己的网格里，
 * 于是同一个组件在海报墙里是竖卡、在清单里是行，间距用各自的。
 */
const {count = 8, shape = 'poster'} = defineProps<{
  count?: number
  /** poster=竖海报卡 · row=清单行 · wide=左图右文宽卡 · stat=指标卡 · text=纯文字块 */
  shape?: 'poster' | 'row' | 'wide' | 'stat' | 'text'
}>()
</script>

<template>
  <!-- 读屏软件念不了闪烁的灰块，给一句人话；灰块本身对它隐藏 -->
  <span class="sr-only" role="status">正在加载…</span>

  <template v-for="i in count" :key="i">
    <!-- 竖海报卡：一张 0.7 比例的图 + 两行标题 + 一行标签 -->
    <div v-if="shape === 'poster'" aria-hidden="true" class="sk-card">
      <div class="sk sk-poster"/>
      <div class="sk-body">
        <div class="sk sk-line" style="width: 92%"/>
        <div class="sk sk-line" style="width: 64%"/>
        <div class="sk sk-chip"/>
      </div>
    </div>

    <!-- 清单行 -->
    <div v-else-if="shape === 'row'" aria-hidden="true" class="sk-row">
      <div class="sk sk-thumb"/>
      <div class="sk-grow">
        <div class="sk sk-line" style="width: 46%"/>
        <div class="sk sk-line sk-sm" style="width: 28%"/>
      </div>
      <div class="sk sk-chip"/>
    </div>

    <!-- 宽卡：左海报右信息 -->
    <div v-else-if="shape === 'wide'" aria-hidden="true" class="sk-card sk-wide">
      <div class="sk sk-poster-sm"/>
      <div class="sk-body sk-grow">
        <div class="sk sk-line" style="width: 70%"/>
        <div class="sk sk-line sk-sm" style="width: 40%"/>
        <div class="d-flex ga-2 mt-3">
          <div class="sk sk-chip"/>
          <div class="sk sk-chip"/>
        </div>
      </div>
    </div>

    <!-- 指标卡 -->
    <div v-else-if="shape === 'stat'" aria-hidden="true" class="sk-card sk-stat">
      <div class="sk sk-avatar"/>
      <div class="sk-grow">
        <div class="sk sk-line" style="width: 40%; height: 20px"/>
        <div class="sk sk-line sk-sm" style="width: 62%"/>
      </div>
    </div>

    <div v-else aria-hidden="true" class="sk sk-line" style="width: 100%"/>
  </template>
</template>

<style scoped>
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

.sk-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--ani-radius, 8px);
    overflow: hidden;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, 1));
    border: 1px solid rgba(var(--v-theme-on-surface), .08);
}

.sk-poster {
    aspect-ratio: .7;
    border-radius: 0;
}

.sk-poster-sm {
    flex: 0 0 96px;
    align-self: stretch;
    min-height: 136px;
    border-radius: 0;
}

.sk-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
}

.sk-grow {
    flex: 1 1 auto;
    min-width: 0;
}

.sk-line {
    height: 12px;
    border-radius: 6px;
}

.sk-sm {
    height: 9px;
}

.sk-chip {
    width: 56px;
    height: 18px;
    border-radius: 999px;
}

.sk-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 8px;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .08);
}

.sk-thumb {
    flex: 0 0 40px;
    height: 56px;
    border-radius: 4px;
}

.sk-wide {
    flex-direction: row;
}

.sk-stat {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 16px;
}

.sk-avatar {
    flex: 0 0 40px;
    height: 40px;
    border-radius: 50%;
}

/* 行与行之间要有间隙，否则一列灰块糊成一整块 */
.sk-row + .sk-row {
    margin-top: 0;
}
</style>
