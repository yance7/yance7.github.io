import { createApp } from 'vue'
import Fixture from './Fixture.vue'
import reveal from '../../../src/directives/reveal'
import magnetic from '../../../src/directives/magnetic'
import pointerSheen from '../../../src/directives/pointerSheen'
import { initializeLocale } from '../../../src/i18n'
import '../../../src/styles.css'
import '../../../src/theme.css'
import '../../../src/fonts-en.css'

const locale = new URLSearchParams(location.search).get('locale')
initializeLocale(locale === 'zh-CN' || locale === 'zh-HK' ? locale : 'en')
document.documentElement.dataset.theme = 'light'
document.documentElement.dataset.fontsReady = 'ready'
createApp(Fixture).directive('reveal', reveal).directive('magnetic', magnetic).directive('pointer-sheen', pointerSheen).mount('#app')
