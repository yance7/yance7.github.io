const redirectScript = document.currentScript
if (redirectScript instanceof HTMLScriptElement) {
  if (redirectScript.hasAttribute('data-home-alias')) {
    const pathname = window.location.pathname
    if (pathname.toLowerCase().endsWith('/index.html')) {
      const destinationPath = pathname.slice(0, -'index.html'.length) || '/'
      const destination = new URL(destinationPath, window.location.origin)
      destination.search = window.location.search
      destination.hash = window.location.hash || document.documentElement.dataset.initialHash || ''
      const nextUrl = `${destination.pathname}${destination.search}${destination.hash}`

      try {
        window.history.replaceState(window.history.state, '', nextUrl)
        document.documentElement.dataset.homeAliasCanonicalized = 'true'
      } catch {
        window.location.replace(nextUrl)
      }
    }

  } else {
    const target = redirectScript.dataset.target
    if (target?.startsWith('/') && !target.startsWith('//')) {
      const destination = new URL(target, window.location.origin)
      if (destination.origin === window.location.origin) {
        destination.search = window.location.search
        destination.hash = window.location.hash
        const nextUrl = `${destination.pathname}${destination.search}${destination.hash}`
        const manualLink = document.querySelector('[data-redirect-link]')
        if (manualLink) manualLink.href = nextUrl
        const alreadyAtDestination = window.location.pathname === destination.pathname
          && window.location.search === destination.search
          && window.location.hash === destination.hash
        if (!alreadyAtDestination) window.location.replace(nextUrl)
      }
    }
  }
}
