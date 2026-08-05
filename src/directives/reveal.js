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
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
  }
  return observer
}

export default {
  mounted(el, binding) {
    if (!('IntersectionObserver' in window)) {
      el.classList.add('revealed')
      return
    }
    if (binding.value && binding.value.delay) {
      el.style.transitionDelay = `${binding.value.delay}ms`
    }
    el.classList.add('reveal')
    ensureObserver().observe(el)
  },
  unmounted(el) {
    if (observer) observer.unobserve(el)
  }
}
