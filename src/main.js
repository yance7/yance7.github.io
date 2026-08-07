import { createApp } from 'vue'
import App from './App.vue'
import reveal from './directives/reveal'
import magnetic from './directives/magnetic'
import './styles.css'
import './theme.css'

const app = createApp(App)
app.directive('reveal', reveal)
app.directive('magnetic', magnetic)
app.mount('#app')

/* 仅迁移一次旧版本 Service Worker，避免每次加载都枚举注册与缓存。 */
const LEGACY_CLEANUP_KEY = 'yance-legacy-sw-cleanup-v1'

function cleanupLegacyServiceWorker() {
  try {
    if (localStorage.getItem(LEGACY_CLEANUP_KEY) === '1') return
  } catch (e) { /* 隐私模式下继续尝试清理 */ }

  const tasks = []
  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {})
    )
  }
  if ('caches' in window) {
    tasks.push(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('yance-')).map((key) => caches.delete(key))))
        .catch(() => {})
    )
  }

  Promise.all(tasks).finally(() => {
    try { localStorage.setItem(LEGACY_CLEANUP_KEY, '1') } catch (e) { /* ignore */ }
  })
}

window.addEventListener('load', cleanupLegacyServiceWorker, { once: true })
