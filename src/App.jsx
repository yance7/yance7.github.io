import { useState } from 'react'
import { navItems, pageMeta } from './data/content'
import { useTheme } from './hooks/useTheme'
import { useMusicNotes } from './hooks/useMusicNotes'

import SiteHeader from './components/SiteHeader.jsx'
import ArchiveHero from './components/ArchiveHero.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import ImageLightbox from './components/ImageLightbox.jsx'
import ScrollProgress from './components/ScrollProgress.jsx'
import CursorGlow from './components/CursorGlow.jsx'

import HomePage from './pages/HomePage.jsx'
import AcademicsPage from './pages/AcademicsPage.jsx'
import HonorsPage from './pages/HonorsPage.jsx'
import ResearchPage from './pages/ResearchPage.jsx'
import WorksPage from './pages/WorksPage.jsx'
import ConcertsPage from './pages/ConcertsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const PAGE_MAP = {
  home: HomePage,
  academics: AcademicsPage,
  honors: HonorsPage,
  research: ResearchPage,
  works: WorksPage,
  concerts: ConcertsPage
}

export default function App({ page }) {
  const { theme, toggleTheme } = useTheme()
  useMusicNotes()
  const [lightbox, setLightbox] = useState(null)

  const currentNav = navItems.find((item) => item.key === page)
  const pageNo = currentNav ? navItems.indexOf(currentNav) + 1 : 0
  const archiveNo = String(pageNo).padStart(2, '0')
  const isHome = page === 'home'
  const isError = !currentNav

  const kicker = isError ? '404 / NOT FOUND' : pageMeta[page][0]
  const heroTitle = isError ? '这一页走丢了' : pageMeta[page][1]
  const heroCopy = isError ? '返回首页，重新选择一个方向。' : pageMeta[page][2]
  const heroCredit = isError ? null : pageMeta[page][3] || null

  const CurrentPage = isError ? NotFoundPage : PAGE_MAP[page] || NotFoundPage

  function moveLightbox(step) {
    setLightbox((lb) => {
      if (!lb) return lb
      const total = lb.images.length
      return { ...lb, index: (lb.index + step + total) % total }
    })
  }

  return (
    <div className={`site-shell theme-${theme}`}>
      <a className="skip-link" href="#main">跳到主要内容</a>
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>
      <div className="grain"></div>

      <CursorGlow />
      <ScrollProgress />

      <SiteHeader page={page} theme={theme} onToggleTheme={toggleTheme} />

      <main id="main">
        <ArchiveHero
          page={page}
          no={archiveNo}
          total={6}
          error={isError}
          isHome={isHome}
          kicker={kicker}
          title={heroTitle}
          copy={heroCopy}
          credit={heroCredit}
        />
        <CurrentPage onOpenLightbox={setLightbox} />
      </main>

      <SiteFooter />

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          meta={lightbox.meta}
          onClose={() => setLightbox(null)}
          onPrev={() => moveLightbox(-1)}
          onNext={() => moveLightbox(1)}
        />
      )}
    </div>
  )
}
