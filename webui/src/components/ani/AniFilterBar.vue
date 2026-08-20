<script setup lang="ts">
import {computed} from 'vue'
import {useAniStore} from '@/stores/ani'

/**
 * 启用状态 + 季度两个筛选。
 *
 * 上游批量管理页顶上就是这两个下拉（外加关键词），主列表顶栏也有启用状态那个；
 * 我们之前只有关键词 —— 订阅上百条以后，「哪些被我停用了」「上一季的还剩哪些」
 * 都只能一条条翻。releaseDateList 这个字段后端一直在给，我们一处都没用过。
 *
 * 做成一个共享组件而不是在五款界面各写一遍：这类清单五份抄下来必然会漂，
 * 之前每条订阅的操作菜单就是这么散掉的。各款只决定摆在哪儿。
 */
const ani = useAniStore()

const STATUS = [
  {value: 'all', title: '全部'},
  {value: 'on', title: '已启用'},
  {value: 'off', title: '未启用'},
] as const

/*
 * 季度候选前面补一个「全部季度」，而不是靠 placeholder + clearable。
 * placeholder 只在没选中时显示，而 v-select 没选中时框里本来就是空的 ——
 * 结果是一个只有箭头的空框，看不出是干什么的，也没法从「某一季」退回「不筛」
 * 除非发现右边那个小叉。补一个空值选项，和左边的状态框长得一样。
 */
const seasonItems = computed(() => [
  {value: '', title: '全部季度'},
  ...ani.seasons.map(v => ({value: v, title: v})),
])
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-3">
    <v-select v-model="ani.status" :items="STATUS" density="compact" hide-details
              style="min-width: 118px; max-width: 132px"/>
    <!-- 季度候选是后端按订阅实际的放送日期算出来的，只有一季订阅时没有可选项，直接不显示 -->
    <v-select v-if="ani.seasons.length > 1" v-model="ani.season" :items="seasonItems" density="compact"
              hide-details style="min-width: 128px; max-width: 148px"/>
    <v-btn v-if="ani.filtering" density="comfortable" prepend-icon="mdi-filter-remove-outline" size="small"
           variant="text" @click="ani.clearFilters()">
      清除筛选
    </v-btn>
  </div>
</template>
