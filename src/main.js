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
