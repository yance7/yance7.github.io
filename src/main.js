import { createApp } from 'vue'
import App from './App.vue'
import reveal from './directives/reveal'
import magnetic from './directives/magnetic'
import './styles.css'
import './theme.css'

const savedTheme = localStorage.getItem('yance-theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = savedTheme

const mount = document.querySelector('#app')
Array.from(document.body.children).forEach((child) => {
  if (child !== mount) child.remove()
})

const app = createApp(App)
app.directive('reveal', reveal)
app.directive('magnetic', magnetic)
app.mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {})
  })
}
