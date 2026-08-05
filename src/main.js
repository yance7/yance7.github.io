import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

const mount = document.querySelector('#app')
Array.from(document.body.children).forEach((child) => {
  if (child !== mount) child.remove()
})

createApp(App).mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {})
  })
}
