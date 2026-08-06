<script setup>
import SectionHeading from '../components/SectionHeading.vue'
</script>

<template>
  <div class="page-404">
    <section class="content error-content">
      <SectionHeading
        no="!"
        label="SIGNAL LOST"
        title="这一页，"
        accent="走丢了。"
        copy="你访问的页面不存在，或者已经被移走。回到主页，重新选一间屋子走进去。"
      />
      <div class="error-actions">
        <a class="btn-primary" href="index.html" v-magnetic>回到首页 <span aria-hidden="true">→</span></a>
        <a class="btn-ghost" href="research.html" v-magnetic>去看看研究 <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </div>
</template>
