import { useRef } from 'react'
import { research, researchMethods } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import TimelineTrack from '../components/TimelineTrack.jsx'
import SectionDots from '../components/SectionDots.jsx'
import Reveal from '../components/Reveal.jsx'
import { useSpotlight } from '../hooks/useSpotlight'

const SECTION_NAV = [
  { id: 'sec-lab-notes', label: 'LAB NOTES' },
  { id: 'sec-toolchain', label: 'TOOLCHAIN' },
  { id: 'sec-research-timeline', label: 'TIMELINE' }
]

function ToolchainCell({ m, i }) {
  const ref = useRef(null)
  useSpotlight(ref)
  return (
    <Reveal as="article" innerRef={ref} className="toolchain-cell" style={{ '--i': i }}>
      <span className="tc-no">{String(i + 1).padStart(2, '0')}</span>
      <div className="tc-main">
        <strong>{m.label}</strong>
        <small>{m.en}</small>
      </div>
      <span className="tc-cat">{m.cat}</span>
    </Reveal>
  )
}

export default function ResearchPage() {
  return (
    <div className="page-research">
      <SectionDots sections={SECTION_NAV} />

      <section id="sec-lab-notes" className="content">
        <SectionHeading
          no="01"
          label="LAB NOTES"
          title="把论文"
          accent="写成产品"
          copy="五个研究项目，从智慧农业到可解释 AI，按时间倒序陈列。每一条都保留提问、假设、方法、原型、结果与下一步——展开方法论，就能看到一条可以复现的思考路径。"
        />
      </section>

      <section id="sec-toolchain" className="content">
        <SectionHeading
          no="02"
          label="TOOLCHAIN"
          title="方法与"
          accent="技术栈"
          copy="横跨深度学习、可解释 AI、微生物组分析与后端工程的方法栈。"
        />
        <Reveal className="toolchain-panel">
          <div className="toolchain-head">
            <span className="tc-head-label">TOOLCHAIN // {researchMethods.length} MODULES</span>
            <span className="tc-head-status"><i></i> ONLINE</span>
          </div>
          <div className="toolchain-grid">
            {researchMethods.map((m, i) => <ToolchainCell key={m.label} m={m} i={i} />)}
          </div>
        </Reveal>
      </section>

      <section id="sec-research-timeline" className="content">
        <SectionHeading
          no="03"
          label="TIMELINE"
          title="研究"
          accent="时间轴"
        />
        <TimelineTrack items={research} />
      </section>
    </div>
  )
}
