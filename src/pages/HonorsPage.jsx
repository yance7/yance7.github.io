import { useRef, useState } from 'react'
import { honors, honorCategories, honorStats } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import MetricStrip from '../components/MetricStrip.jsx'
import ArchiveFilter from '../components/ArchiveFilter.jsx'
import SectionDots from '../components/SectionDots.jsx'
import Reveal from '../components/Reveal.jsx'
import { useSpotlight } from '../hooks/useSpotlight'

const SECTION_NAV = [
  { id: 'sec-milestones', label: 'MILESTONES' },
  { id: 'sec-honors-archive', label: 'ARCHIVE' }
]

const LEVEL_LABEL = {
  peak: '领航级',
  excellent: '卓越级',
  emerging: '新锐级'
}

const categoryCounts = honors.reduce((counts, h) => {
  counts[h.level] = (counts[h.level] || 0) + 1
  return counts
}, { all: honors.length })

function HonorCard({ h, i, expanded, onToggle }) {
  const ref = useRef(null)
  useSpotlight(ref)
  return (
    <Reveal
      as="article"
      innerRef={ref}
      className={`honor-card ${h.level}${expanded ? ' expanded' : ''}`}
      delay={i * 60}
    >
      <div className="honor-date-col">
        <span className="honor-date">{h.date}</span>
        <span className="honor-level-dot" aria-hidden="true"></span>
      </div>
      <div className="honor-content">
        <span className="honor-level-tag">{LEVEL_LABEL[h.level]}</span>
        <h3>{h.title}</h3>
        <span className="honor-org">{h.org}</span>
        <p className="honor-detail">{h.detail}</p>
        <button
          className="honor-expand"
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? '收起' : '详情'}
        </button>
      </div>
    </Reveal>
  )
}

export default function HonorsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const filteredHonors = activeCategory === 'all'
    ? honors
    : honors.filter((h) => h.level === activeCategory)

  return (
    <div className="page-honors">
      <SectionDots sections={SECTION_NAV} />

      <section id="sec-milestones" className="content">
        <SectionHeading
          no="01"
          label="MILESTONES"
          title="每一枚奖章，都是"
          accent="向上的证据"
          copy="奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。"
        />
        <MetricStrip metrics={honorStats} />
      </section>

      <section id="sec-honors-archive" className="content">
        <SectionHeading
          no="02"
          label="ARCHIVE"
          title="十三枚"
          accent="坐标"
          copy="2025 — 2026 赛季的十三项记录，按时间倒序排列，分为领航、卓越与新锐三档。"
        />

        <ArchiveFilter
          categories={honorCategories}
          counts={categoryCounts}
          active={activeCategory}
          onFilter={setActiveCategory}
        />

        <div className="honor-timeline">
          {filteredHonors.map((h, i) => (
            <HonorCard
              key={h.title}
              h={h}
              i={i}
              expanded={expanded === h.title}
              onToggle={() => setExpanded(expanded === h.title ? null : h.title)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
