import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './theme.css'

const savedTheme = (() => {
  try {
    return localStorage.getItem('yance-theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
})()
document.documentElement.dataset.theme = savedTheme

const mount = document.querySelector('#app')
Array.from(document.body.children).forEach((child) => {
  if (child !== mount) child.remove()
})

const page = document.body.dataset.page || 'home'

createRoot(mount).render(<App page={page} />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {})
  })
}
