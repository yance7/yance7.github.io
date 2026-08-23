<script setup lang="ts">
import SectionHeading from '../components/SectionHeading.vue'
import YanceButton from '../components/YanceButton.vue'
</script>

<template>
  <div class="page-404">
    <section class="content error-content">
      <SectionHeading
        no="!"
        label="SIGNAL LOST"
        title="这一页，"
        accent="走丢了"
        copy="你访问的页面不存在，或者已经被移走。回到主页，重新选一间屋子走进去。"
      />
      <div class="error-actions">
        <YanceButton href="index.html" variant="primary" v-magnetic>
          回到首页
          <template #trailing>→</template>
        </YanceButton>
        <YanceButton href="research.html" variant="secondary" v-magnetic>
          去看看研究
          <template #trailing>→</template>
        </YanceButton>
      </div>
    </section>
  </div>
</template>
