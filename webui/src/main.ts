import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@shared/themes/base.css'

/*
 * 演示构建（GitHub Pages 预览）在挂载前把 fetch 换成假服务端。
 * 用动态 import：__DEMO__ 是构建期常量，正式产物里这个分支和整个 demo/ 目录一起被摇掉。
 */
if (__DEMO__) {
    const {installDemo} = await import('./demo')
    installDemo()
}

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
