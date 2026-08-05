let observer = null

function ensureObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' })
  }
  return observer
}

export default {
  mounted(el, binding) {
    if (!('IntersectionObserver' in window)) {
      el.classList.add('revealed')
      return
    }

    /* 尊重 prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('revealed')
      return
    }

    /* 支持 v-reveal="{ delay: 200 }" 或 v-reveal="200" */
    let delay = 0
    if (binding.value) {
      if (typeof binding.value === 'number') delay = binding.value
      else if (binding.value.delay) delay = binding.value.delay
    }
    if (delay) el.style.transitionDelay = `${delay}ms`

    /* 支持 v-reveal="{ variant: 'fade-up' | 'fade-left' | 'fade-right' | 'clip' | 'scale' | 'blur' }" */
    const variant = binding.value?.variant || 'fade-up'
    el.dataset.revealVariant = variant

    el.classList.add('reveal')
    ensureObserver().observe(el)
  },
  unmounted(el) {
    if (observer) observer.unobserve(el)
  }
}
