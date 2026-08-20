<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useAniScreen} from '@/composables/useAniScreen'
import AniPosterCard from '@/components/ani/AniPosterCard.vue'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 海报墙：卡片给到最大，星期做成顶部的快捷跳转条。
 *
 * 追番的人一周看几次，最常做的动作是「今天更新了什么」，不是搜索也不是编辑，
 * 所以星期条常驻在最上面，点一下滚到那一组。
 *
 * 卡片用的是 AniPosterCard（整张是图，字压在图上），不是 M3 那张有文字区的卡 ——
 * 一屏塞得下更多张，而且壁纸打底的界面里，白底文字块会把背景切得七零八落。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

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

    <!-- 窄屏只留「添加」带字，其余收成图标：五个带字按钮在 360px 上要占三行 -->
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn v-if="!mobile" :loading="s.ani.loading" prepend-icon="mdi-refresh" variant="tonal"
             @click="s.ani.refreshAll()">刷新全部
      </v-btn>
      <v-btn v-else :loading="s.ani.loading" icon="mdi-refresh" title="刷新全部" variant="tonal"
             @click="s.ani.refreshAll()"/>
      <v-btn v-if="!mobile" prepend-icon="mdi-package-variant-closed" variant="tonal"
             @click="s.collecting.value = true">合集
      </v-btn>
      <v-btn v-else icon="mdi-package-variant-closed" title="合集下载" variant="tonal"
             @click="s.collecting.value = true"/>
      <v-btn v-if="!mobile" prepend-icon="mdi-file-import-outline" variant="tonal"
             @click="s.importing.value = true">导入
      </v-btn>
      <v-btn v-else icon="mdi-file-import-outline" title="导入订阅" variant="tonal"
             @click="s.importing.value = true"/>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="mobile ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="mobile ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             title="多选" variant="tonal" @click="s.toggleSelectMode()">
        <template v-if="!mobile">{{ s.selectMode.value ? '退出多选' : '多选' }}</template>
      </v-btn>
    </div>

    <AniBatchBar :s="s" rounded="lg"/>

    <!-- 首屏空着的时候上骨架，形状跟海报墙一致；刷新时不铺骨架，只在顶上走一条细线 -->
    <div v-if="s.ani.loading && !s.ani.all.length" class="poster-wall">
      <AniSkeleton :count="12" shape="poster"/>
    </div>

    <template v-else>
      <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

      <v-empty-state
          v-if="!s.ani.filtered.length"
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
            <AniPosterCard v-for="(a, i) in w.items" :key="a.id" :item="a" :s="s" :select-mode="s.selectMode.value"
                           :selected="!!a.id && s.ani.selected.has(a.id)" :style="{'--i': i}" class="ani-in"/>
          </div>
        </section>
      </template>

      <div v-else class="poster-wall">
        <AniPosterCard v-for="(a, i) in s.ani.filtered" :key="a.id" :item="a" :s="s" :select-mode="s.selectMode.value"
                       :selected="!!a.id && s.ani.selected.has(a.id)" :style="{'--i': i}" class="ani-in"/>
      </div>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.week-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    /* 滚动条出现时不改变自身高度，否则下面整片海报墙会跳一下 */
    scrollbar-gutter: stable;
    scrollbar-width: none;
}

.week-bar::-webkit-scrollbar {
    display: none;
}

.week-title {
    font-family: var(--ani-font-title, inherit);
    font-size: 1.15rem;
    font-weight: 700;
}

/*
 * 海报墙。间距给到 18/24 —— 之前 14px 时卡与卡几乎贴着，
 * 悬停抬起的那 7px 位移被邻居挡住，动效等于白做。
 */
.poster-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 18px;
    /* 抬起会超出网格上沿，不留空间的话位移和光晕都会被父级裁掉 */
    padding: 8px 2px;
    margin: -8px -2px;
}

@media (min-width: 960px) {
    .poster-wall {
        grid-template-columns: repeat(auto-fill, minmax(186px, 1fr));
        gap: 24px;
    }
}

/* 超宽屏封顶：不封的话 auto-fill 会把卡片拉到 300px 以上，海报糊得很明显 */
@media (min-width: 1920px) {
    .poster-wall {
        grid-template-columns: repeat(auto-fill, minmax(200px, 226px));
        justify-content: center;
    }
}
</style>
