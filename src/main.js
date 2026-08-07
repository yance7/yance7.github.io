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

/* 清理旧版本留下的 Service Worker，避免旧缓存继续覆盖新构建。 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch(() => {})
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith('yance-')).forEach((key) => caches.delete(key))
      }).catch(() => {})
    }
  })
}
