import { heroGeo } from '../data/content'
import Reveal from './Reveal.jsx'

export default function ArchiveHero({
  page,
  no,
  total,
  error = false,
  kicker = '',
  title = '',
  copy = '',
  credit = null,
  isHome = false
}) {
  const coordsLabel = error ? 'ARCHIVE / ERROR' : `ARCHIVE ${no} / ${total}`
  const geo = error ? '—' : heroGeo[page] || '—'
  const chars = title.split('')

  return (
    <section className={`archive-hero ${isHome ? 'hero-home' : ''}`}>
      <div className="hero-inner">
        <div className="hero-main">
          <Reveal as="p" className="hero-kicker">{kicker}</Reveal>

          {isHome ? (
            <Reveal as="h1" className="hero-name" delay={90}>Yance<span>.</span></Reveal>
          ) : (
            <h1 className="hero-title hero-lyric" aria-label={title}>
              {chars.map((ch, i) => (
                <span key={`${ch}-${i}`} className="lyric-char" style={{ '--ci': i }} aria-hidden="true">{ch}</span>
              ))}
            </h1>
          )}

          <Reveal as="p" className="hero-copy" delay={180}>{copy}</Reveal>

          {!isHome && (
            <Reveal as="p" className="lyric-note" delay={240}>
              LYRIC / PERSONAL ARCHIVE
              <span className="lyric-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </Reveal>
          )}

          {credit && !isHome && (
            <Reveal as="p" className="lyric-credit" delay={270}>
              <b>{credit.artist}</b>
              <i aria-hidden="true">/</i>
              <span>「{credit.song}」</span>
              <i aria-hidden="true">/</i>
              {credit.album
                ? <span className="lc-album">《{credit.album}》</span>
                : <span className="lc-album">单曲</span>}
            </Reveal>
          )}

          <Reveal className="hero-line" delay={300}><span></span></Reveal>
        </div>

        <aside className="hero-side" aria-hidden="true">
          <div className="archive-coords">
            <span className="coords-label">{coordsLabel}</span>
            <span className="coords-geo">{geo}</span>
            <span className="coords-bar"><i></i></span>
          </div>
          {isHome && <div className="hero-scroll"><span></span>SCROLL</div>}
        </aside>
      </div>
    </section>
  )
}
