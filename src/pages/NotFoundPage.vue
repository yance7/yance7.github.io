<script setup lang="ts">
import SectionHeading from '../components/SectionHeading.vue'
import YanceButton from '../components/YanceButton.vue'
import { buildLocalizedPageHref, useLocale } from '../i18n'

const { locale, messages } = useLocale()
</script>

<template>
  <div class="page-404">
    <section class="content error-content">
      <SectionHeading
        no="!"
        :label="messages.error404.kicker"
        :title="messages.error404.title"
        accent=""
        :copy="messages.error404.copy"
      />
      <div class="error-actions">
        <YanceButton :href="buildLocalizedPageHref('home', locale)" variant="primary" v-magnetic>
          {{ messages.error404.home }}
          <template #trailing>→</template>
        </YanceButton>
        <YanceButton :href="buildLocalizedPageHref('research', locale)" variant="secondary" v-magnetic>
          {{ messages.error404.research }}
          <template #trailing>→</template>
        </YanceButton>
      </div>
    </section>
  </div>
</template>
