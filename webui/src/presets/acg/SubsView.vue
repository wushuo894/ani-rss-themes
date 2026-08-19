<script setup lang="ts">
import {ref} from 'vue'
import {useAniScreen} from '@/composables/useAniScreen'
import AniCard from '@/components/ani/AniCard.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 海报墙：卡片给到最大，星期做成顶部的快捷跳转条。
 *
 * 追番的人一周看几次，最常做的动作是「今天更新了什么」，不是搜索也不是编辑，
 * 所以星期条常驻在最上面，点一下滚到那一组。
 */
const s = useAniScreen()

const sections = ref<Record<string, HTMLElement | null>>({})

function jump(label: string) {
  sections.value[label]?.scrollIntoView({behavior: 'smooth', block: 'start'})
}
</script>

<template>
  <div class="pa-4">
    <!-- 星期快捷条：搜索时没有分组，这条也跟着收起来 -->
    <div v-if="s.grouped.value && s.ani.byWeek.length" class="week-bar mb-4">
      <v-chip v-for="w in s.ani.byWeek" :key="w.label" size="small" variant="flat" @click="jump(w.label)">
        {{ w.label }}
        <span class="ml-1 text-medium-emphasis">{{ w.items.length }}</span>
      </v-chip>
    </div>

    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" variant="tonal" @click="s.ani.refreshAll()">
        刷新全部
      </v-btn>
      <v-btn prepend-icon="mdi-package-variant-closed" variant="tonal" @click="s.collecting.value = true">合集</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" variant="tonal" @click="s.importing.value = true">导入</v-btn>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             variant="tonal" @click="s.toggleSelectMode()">
        {{ s.selectMode.value ? '退出多选' : '多选' }}
      </v-btn>
    </div>

    <AniBatchBar :s="s" rounded="lg"/>

    <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

    <v-empty-state
        v-if="!s.ani.loading && !s.ani.filtered.length"
        :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅，点上面添加一个'"
        :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <template v-else-if="s.grouped.value">
      <section v-for="w in s.ani.byWeek" :key="w.label" :ref="el => (sections[w.label] = el as HTMLElement)"
               class="mb-8">
        <div class="d-flex align-center ga-2 mb-3">
          <h3 class="week-title">{{ w.label }}</h3>
          <v-chip size="x-small" variant="flat">{{ w.items.length }}</v-chip>
        </div>
        <div class="poster-wall">
          <AniCard v-for="a in w.items" :key="a.id" :item="a"
                   :select-mode="s.selectMode.value" :selected="!!a.id && s.ani.selected.has(a.id)"
                   class="wall-card"
                   @cover="s.on.cover" @del="s.on.del" @edit="s.on.edit" @playlist="s.on.playlist"
                   @preview="s.on.preview" @rate="s.on.rate" @toggle="s.on.toggle"/>
        </div>
      </section>
    </template>

    <div v-else class="poster-wall">
      <AniCard v-for="a in s.ani.filtered" :key="a.id" :item="a"
               :select-mode="s.selectMode.value" :selected="!!a.id && s.ani.selected.has(a.id)"
               class="wall-card"
               @cover="s.on.cover" @del="s.on.del" @edit="s.on.edit" @playlist="s.on.playlist"
               @preview="s.on.preview" @rate="s.on.rate" @toggle="s.on.toggle"/>
    </div>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.week-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
}

.week-bar::-webkit-scrollbar {
    display: none;
}

.week-title {
    font-family: var(--ani-font-title, inherit);
    font-size: 1.1rem;
    font-weight: 600;
}

.poster-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
}

@media (min-width: 960px) {
    .poster-wall {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
    }
}

/* 海报墙的招牌动作：抬起 + 主色光晕 */
.wall-card {
    transition: transform .22s cubic-bezier(.2, .8, .3, 1), box-shadow .22s;
}

.wall-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(var(--v-theme-primary), .45);
}

@media (hover: none) {
    .wall-card:hover {
        transform: none;
        box-shadow: none;
    }
}
</style>
