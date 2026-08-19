<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {useUiStore} from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const keep = ref(false)
const showPassword = ref(false)

onMounted(() => {
  // 上游的「记住密码」是明文存 localStorage，这里沿用同一个键，从自带界面切过来能直接带出
  const r = auth.remember
  if (r.remember) {
    username.value = r.username
    password.value = r.password
    keep.value = true
  }
})

async function submit() {
  if (!username.value || !password.value) {
    ui.error('请输入账号与密码')
    return
  }
  try {
    await auth.login(username.value, password.value, keep.value)
    // 登录成功后回到进入登录页之前想去的地方
    const to = (router.currentRoute.value.query.redirect as string) || '/'
    await router.replace(to)
  } catch {
    // 具体错误信息由接口层的错误处理器弹出，这里不重复提示
  }
}
</script>

<template>
  <v-main class="login-bg">
    <v-container class="fill-height d-flex align-center justify-center">
      <v-card class="pa-6 login-card" elevation="8" max-width="400" width="100%">
        <div class="text-center mb-6">
          <v-avatar color="primary" size="64" class="mb-3">
            <v-icon size="36">mdi-rss</v-icon>
          </v-avatar>
          <h1 class="text-h5 font-weight-medium">ANI-RSS</h1>
        </div>

        <v-form @submit.prevent="submit">
          <v-text-field
              v-model.trim="username"
              autocomplete="username"
              class="mb-3"
              label="用户名"
              prepend-inner-icon="mdi-account"
          />
          <v-text-field
              v-model.trim="password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              label="密码"
              prepend-inner-icon="mdi-key"
              @click:append-inner="showPassword = !showPassword"
          />

          <div class="d-flex align-center justify-space-between mt-2">
            <v-checkbox v-model="keep" density="compact" hide-details label="记住密码"/>
            <v-btn :loading="auth.loading" append-icon="mdi-arrow-right" color="primary" type="submit">
              登录
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </v-container>

    <div class="text-center pb-6 text-medium-emphasis text-caption">
      <a class="text-medium-emphasis mr-3" href="https://docs.wushuo.top" rel="noopener" target="_blank">ani-rss</a>
      <a class="text-medium-emphasis" href="https://github.com/wushuo894/ani-rss" rel="noopener" target="_blank">github</a>
    </div>
  </v-main>
</template>

<style scoped>
.login-bg {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

/* 移动端小屏时卡片别贴边 */
.login-card {
    margin: 0 8px;
}
</style>
