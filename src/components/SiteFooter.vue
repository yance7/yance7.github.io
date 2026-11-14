<script setup lang="ts">
import { computed } from 'vue'
import { footerContacts } from '../data/footerContacts'
import { buildLocalizedPageHref, useLocale } from '../i18n'
import BrandMark from './BrandMark.vue'
import FooterContactIcon from './FooterContactIcon.vue'

const { locale, messages } = useLocale()
const localizedHomeHref = computed(() => buildLocalizedPageHref('home', locale.value))
</script>

<template>
  <footer class="site-footer">
    <div class="foot-identity" v-reveal>
      <a class="foot-mark" :href="localizedHomeHref" :aria-label="messages.footer.homeLabel">
        <BrandMark variant="footer" />
      </a>
      <div class="foot-meta">
        <p>{{ messages.footer.archive }}</p>
        <p>{{ messages.footer.identity }}</p>
      </div>
    </div>
    <address class="foot-contacts" :aria-label="messages.footer.contactsLabel" v-reveal="{ delay: 60 }">
      <a
        v-for="contact in footerContacts"
        :key="contact.key"
        class="foot-contact"
        :href="contact.href"
        :target="contact.external ? '_blank' : undefined"
        :rel="contact.external ? 'noopener noreferrer' : undefined"
        :aria-label="`${messages.footer[contact.key]}: ${contact.value}`"
      >
        <FooterContactIcon :name="contact.key" />
      </a>
    </address>
  </footer>
</template>
