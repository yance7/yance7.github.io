import { useRef, useState } from 'react'
import { concerts, concertGroups, concertMoods, concertStats } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import MetricStrip from '../components/MetricStrip.jsx'
import Reveal from '../components/Reveal.jsx'

const sortedYears = Object.keys(concertGroups).sort()
const venueCount = new Set(concerts.map((c) => c.venue)).size
const artistCount = concertStats.artists.split(' · ').length
const posterCount = new Set(concerts.flatMap((c) => c.images)).size

const concertMetrics = [
  { value: String(concertStats.total), label: '现场', note: concertStats.yearRange },
  { value: String(venueCount), label: '场馆', note: concertStats.venues },
  { value: `${artistCount}+`, label: '艺人', note: `${posterCount} 张海报` }
]

const preloaded = new Set()

function imagePath(name) {
  return `assets/concerts/${name}`
}

function ConcertRow({ item, carouselIndexes, onMove, onOpen }) {
  const posterRef = useRef(null)
  const index = carouselIndexes[item.date] || 0

  function preloadItem() {
    item.images.forEach((name) => {
      const src = imagePath(name)
      if (preloaded.has(src)) return
      preloaded.add(src)
      const img = new Image()
      img.src = src
      img.decoding = 'async'
    })
  }

  function tiltPoster(e) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = posterRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`)
  }

  function resetPoster() {
    const el = posterRef.current
    if (!el) return
    el.style.removeProperty('--rx')
    el.style.removeProperty('--ry')
  }

  return (
    <Reveal as="article" className="concert-row" onMouseEnter={preloadItem}>
      <div className="concert-date">{item.date}<span></span></div>
      <div
        ref={posterRef}
        className={`concert-poster ${item.land ? 'land' : ''}`}
        onMouseMove={tiltPoster}
        onMouseLeave={resetPoster}
      >
        <img
          src={imagePath(item.images[index])}
          alt={`${item.artist} ${item.tour} 海报`}
          loading="lazy"
          decoding="async"
          onClick={() => onOpen(item, index)}
        >
        </img>
        <div className="poster-hint" aria-hidden="true">
          <span>打开档案</span><b>↗</b>
        </div>
        {item.images.length > 1 && (
          <div className="carousel-controls">
            <button type="button" aria-label="上一张" onClick={(e) => { e.stopPropagation(); onMove(item, -1) }}>←</button>
            <span>{index + 1} / {item.images.length}</span>
            <button type="button" aria-label="下一张" onClick={(e) => { e.stopPropagation(); onMove(item, 1) }}>→</button>
          </div>
        )}
      </div>
      <div className="concert-info">
        <span>{item.venue}</span>
        <h3>{item.artist}</h3>
        <p>{item.tour}</p>
      </div>
    </Reveal>
  )
}

export default function ConcertsPage({ onOpenLightbox }) {
  const [carouselIndexes, setCarouselIndexes] = useState({})

  function moveCarousel(item, step) {
    setCarouselIndexes((prev) => {
      const current = prev[item.date] || 0
      const next = (current + step + item.images.length) % item.images.length
      return { ...prev, [item.date]: next }
    })
  }

  function openLightbox(item, index = 0) {
    onOpenLightbox({
      images: item.images.map(imagePath),
      index,
      meta: { artist: item.artist, tour: item.tour }
    })
  }

  return (
    <div className="page-concerts">
      <section className="content">
        <SectionHeading
          no="01"
          label="LIVE ARCHIVE"
          title="现场是"
          accent="另一种记忆。"
          copy="点击海报进入全屏档案。每张图都保留原始比例，轮播记录同一场演出的不同视觉。"
        />
        <MetricStrip metrics={concertMetrics} />
      </section>

      {sortedYears.map((year) => (
        <section key={year} className="content concert-group">
          <Reveal className="group-header">
            <span className="group-year">{year}</span>
            <p className="group-mood">{concertMoods[year] || ''}</p>
            <span className="group-count">{concertGroups[year].length} 场</span>
          </Reveal>

          <div className="concert-list">
            {concertGroups[year].map((item) => (
              <ConcertRow
                key={item.date}
                item={item}
                carouselIndexes={carouselIndexes}
                onMove={moveCarousel}
                onOpen={openLightbox}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
