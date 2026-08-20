<script setup lang="ts">
import {ref} from 'vue'
import type {Ani} from '@shared/types'
import * as api from '@shared/api'
import {toApiFile} from '@shared/http'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const ani = useAniStore()
const ui = useUiStore()
const dialog = ref(true)
const busy = ref('')

/** 改本地副本，点「保存」才落盘 —— 抓错了图可以直接关掉不认账 */
const form = ref<Ani>(JSON.parse(JSON.stringify(props.item)))

/** 封面路径常常不变（同一个文件被覆盖），靠这个参数打破浏览器缓存 */
const bust = ref(Date.now())

/**
 * 从 image 那个外链地址重新抓一张。
 *
 * 后端 refreshCover 会返回新的本地路径，要接住 —— 之前把返回值丢了，
 * 靠整表刷新兜住；在这个对话框里编辑的是本地副本，兜不住，图换了但预览还是旧的。
 */
async function reload() {
  busy.value = 'reload'
  try {
    const cover = await api.refreshCover(form.value)
    if (cover) form.value.cover = cover
    bust.value = Date.now()
    ui.success('封面已重新抓取')
  } finally {
    busy.value = ''
  }
}

/**
 * 上传本地图片当封面。
 *
 * 番剧站的图有时候就是没有、或者糊，上游给了拖放上传，我们之前只有「重新抓取」——
 * 抓不到就没别的办法了。api/upload 早就封装好了，只是一处都没被用过。
 * 限制照抄上游：jpg / png，1MB 以内（后端不校验，超了会真的写进 config 目录）。
 */
async function onPick(picked: File | File[]) {
  const fs = Array.isArray(picked) ? picked : picked ? [picked] : []
  const f = fs[0]
  if (!f) return
  if (!['image/jpeg', 'image/png'].includes(f.type)) return ui.error('只支持 jpg / png')
  if (f.size > 1024 * 1024) return ui.error('图片要小于 1MB')

  busy.value = 'upload'
  try {
    form.value.cover = await api.upload(f)
    bust.value = Date.now()
    ui.success('已上传，点保存生效')
  } finally {
    busy.value = ''
  }
}

async function save() {
  busy.value = 'save'
  try {
    await ani.update(form.value, false, '封面已保存')
    dialog.value = false
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="640" scrollable @after-leave="emit('close')">
    <v-card>
      <v-card-title class="text-truncate">封面 · {{ item.title }}</v-card-title>
      <v-divider/>

      <v-card-text>
        <div class="wrap">
          <v-img
              :src="form.cover ? `${toApiFile(form.cover)}&_=${bust}` : ''"
              aspect-ratio="0.7" class="shot" cover width="176">
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                <v-icon icon="mdi-image-outline" size="28"/>
              </div>
            </template>
          </v-img>

          <div class="side">
            <!-- 图片地址：后端就是从这里抓图，所以换封面的正路是「改地址 → 重新抓」 -->
            <v-text-field
                v-model="form.image" density="comfortable" hide-details
                label="图片地址" placeholder="https://lain.bgm.tv/pic/cover/l/xxx.jpg">
              <template #append>
                <v-btn :disabled="!form.image" :loading="busy === 'reload'" icon="mdi-refresh"
                       size="small" title="从这个地址重新抓取" variant="tonal" @click="reload"/>
              </template>
            </v-text-field>

            <div class="or">或者传一张本地的</div>

            <v-file-input
                :loading="busy === 'upload'" accept="image/jpeg,image/png" density="comfortable"
                hide-details label="选择图片" prepend-icon="" prepend-inner-icon="mdi-upload"
                @update:model-value="onPick"/>
            <div class="text-caption text-medium-emphasis mt-2">jpg / png，1MB 以内</div>
          </div>
        </div>
      </v-card-text>

      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn :loading="busy === 'save'" color="primary" variant="flat" @click="save">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.shot {
    flex: 0 0 auto;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
}

.side {
    flex: 1 1 260px;
    min-width: 0;
}

/* 「或者」分隔线：两侧各画一条，中间留字 */
.or {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 16px;
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), .55);
}

.or::before,
.or::after {
    content: '';
    flex: 1 1 auto;
    height: 1px;
    background: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
