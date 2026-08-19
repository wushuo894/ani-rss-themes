<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import * as api from '@shared/api'
import {useConfigStore} from '@/stores/config'
import {useUiStore} from '@/stores/ui'
import {BASIC_SECTIONS, DOWNLOAD_SECTIONS, EXCLUDE_SECTION, LOGIN_SECTIONS, PROXY_SECTION} from '@/components/settings/schema'
import SettingSection from '@/components/settings/SettingSection.vue'
import PageSettings from '@/components/settings/PageSettings.vue'
import NotificationSettings from '@/components/settings/NotificationSettings.vue'
import BackupSettings from '@/components/settings/BackupSettings.vue'
import IntegrationUrls from '@/components/settings/IntegrationUrls.vue'
import AboutSettings from '@/components/settings/AboutSettings.vue'
import AfdianSettings from '@/components/settings/AfdianSettings.vue'

const store = useConfigStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const {mobile} = useDisplay()

const TABS = [
  {value: 'download', label: '下载设置'},
  {value: 'basic', label: '基本设置'},
  {value: 'exclude', label: '全局排除'},
  {value: 'proxy', label: '代理设置'},
  {value: 'login', label: '登录设置'},
  {value: 'notification', label: '通知'},
  {value: 'afdian', label: '捐赠'},
  {value: 'about', label: '关于'},
]

// 标签页写进路由，刷新和分享链接都能停在同一页
const tab = computed({
  get: () => (TABS.some(t => t.value === route.params.tab) ? String(route.params.tab) : 'download'),
  set: v => void router.replace({name: 'settings', params: {tab: v}}),
})

const config = computed(() => store.config)
const testing = ref('')

onMounted(() => void store.load())

async function testDownloadTool() {
  testing.value = 'download'
  try {
    await api.downloadLoginTest(config.value)
    ui.success('下载器连接正常')
  } finally {
    testing.value = ''
  }
}

async function testProxy() {
  testing.value = 'proxy'
  try {
    const r = await api.testProxy('https://api.bgm.tv', config.value)
    ui.success(`代理可用${r?.time ? `，耗时 ${r.time}ms` : ''}`)
  } finally {
    testing.value = ''
  }
}

async function updateTrackers() {
  testing.value = 'trackers'
  try {
    await api.trackersUpdate(config.value)
    ui.success('Trackers 已更新')
  } finally {
    testing.value = ''
  }
}

async function testIpWhitelist() {
  testing.value = 'ip'
  try {
    await api.testIpWhitelist()
    ui.success('当前 IP 在白名单内')
  } finally {
    testing.value = ''
  }
}
</script>

<template>
  <div class="settings-page">
    <v-tabs v-model="tab" :direction="mobile ? 'horizontal' : 'horizontal'" density="comfortable" show-arrows>
      <v-tab v-for="t in TABS" :key="t.value" :value="t.value">{{ t.label }}</v-tab>
    </v-tabs>
    <v-divider/>

    <v-progress-linear v-if="store.loading" indeterminate/>

    <div class="pa-4 settings-body">
      <v-tabs-window v-model="tab">
        <!-- ══ 下载设置 ══ -->
        <v-tabs-window-item value="download">
          <v-expansion-panels multiple variant="accordion" :model-value="[0, 1, 2]">
            <v-expansion-panel v-for="s in DOWNLOAD_SECTIONS" :key="s.title" :title="s.title">
              <template #text>
                <SettingSection :config="config" :section="s">
                  <v-btn v-if="s.title === '下载工具'" :loading="testing === 'download'" class="mt-2"
                         prepend-icon="mdi-lan-connect" variant="tonal" @click="testDownloadTool">
                    测试连接
                  </v-btn>
                </SettingSection>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-tabs-window-item>

        <!-- ══ 基本设置 ══ -->
        <v-tabs-window-item value="basic">
          <v-expansion-panels variant="accordion">
            <!-- 页面设置里有一半是浏览器本地偏好，单独做一个组件 -->
            <v-expansion-panel title="页面设置">
              <template #text>
                <PageSettings :config="config"/>
              </template>
            </v-expansion-panel>

            <v-expansion-panel v-for="s in BASIC_SECTIONS.slice(1)" :key="s.title" :title="s.title">
              <template #text>
                <SettingSection :config="config" :section="s">
                  <v-btn v-if="s.title === 'Trackers'" :loading="testing === 'trackers'" class="mt-2"
                         prepend-icon="mdi-download" variant="tonal" @click="updateTrackers">
                    立即更新
                  </v-btn>
                  <IntegrationUrls v-if="s.title === '其他'" :config="config"/>
                </SettingSection>
              </template>
            </v-expansion-panel>

            <v-expansion-panel title="备份">
              <template #text>
                <BackupSettings/>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-tabs-window-item>

        <!-- ══ 全局排除 ══ -->
        <v-tabs-window-item value="exclude">
          <SettingSection :config="config" :section="EXCLUDE_SECTION"/>
        </v-tabs-window-item>

        <!-- ══ 代理 ══ -->
        <v-tabs-window-item value="proxy">
          <SettingSection :config="config" :section="PROXY_SECTION">
            <v-btn :loading="testing === 'proxy'" prepend-icon="mdi-lan-connect" variant="tonal" @click="testProxy">
              测试代理
            </v-btn>
          </SettingSection>
        </v-tabs-window-item>

        <!-- ══ 登录 ══ -->
        <v-tabs-window-item value="login">
          <div v-if="config.login" class="mb-6">
            <div class="text-subtitle-2 mb-1">账号</div>
            <div class="text-caption text-medium-emphasis mb-3">密码留空表示不修改。</div>
            <v-text-field v-model="config.login.username" autocomplete="off" class="mb-3" label="用户名"/>
            <v-text-field v-model="config.login.password" autocomplete="new-password" label="新密码"
                          placeholder="留空则不修改" type="password"/>
          </div>

          <template v-for="s in LOGIN_SECTIONS.slice(1)" :key="s.title">
            <div class="text-subtitle-2 mb-2 mt-4">{{ s.title }}</div>
            <SettingSection :config="config" :section="s">
              <v-btn v-if="s.title === '访问控制'" :loading="testing === 'ip'" class="mt-2"
                     prepend-icon="mdi-ip-network-outline" variant="tonal" @click="testIpWhitelist">
                测试当前 IP
              </v-btn>
            </SettingSection>
          </template>
        </v-tabs-window-item>

        <!-- ══ 通知 ══ -->
        <v-tabs-window-item value="notification">
          <NotificationSettings :config="config"/>
        </v-tabs-window-item>

        <!-- ══ 捐赠 ══ -->
        <v-tabs-window-item value="afdian">
          <AfdianSettings :config="config"/>
        </v-tabs-window-item>

        <!-- ══ 关于 ══ -->
        <v-tabs-window-item value="about">
          <AboutSettings/>
        </v-tabs-window-item>
      </v-tabs-window>
    </div>

    <!-- 保存条常驻底部：设置项很长，翻到哪都能存 -->
    <v-sheet v-if="tab !== 'about' && tab !== 'afdian'" class="save-bar d-flex align-center ga-2 px-4 py-3" elevation="4">
      <span class="text-caption text-medium-emphasis">改动不会自动保存</span>
      <v-spacer/>
      <v-btn :disabled="store.saving" variant="text" @click="store.load(true)">放弃改动</v-btn>
      <v-btn :loading="store.saving" color="primary" prepend-icon="mdi-content-save" variant="flat"
             @click="store.save()">
        保存设置
      </v-btn>
    </v-sheet>
  </div>
</template>

<style scoped>
.settings-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
}

.settings-body {
    flex: 1 1 auto;
    overflow-y: auto;
}

.save-bar {
    position: sticky;
    bottom: 0;
    /* 底部安全区，避免被 iPhone 横条压住 */
    padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
    background: rgb(var(--v-theme-surface));
}
</style>
