import { stats, education, apScores } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import MetricStrip from '../components/MetricStrip.jsx'
import Reveal from '../components/Reveal.jsx'

export default function AcademicsPage() {
  return (
    <div className="page-academics">
      <section className="content">
        <SectionHeading
          no="00"
          label="EDUCATION"
          title="求学"
          accent="经历"
          copy="从朝阳实验小学到八十中学国际部，十一年求学的物理坐标。"
        />
        <div className="education-track">
          {education.map((edu, i) => (
            <Reveal as="article" key={edu.name} className="education-row" delay={i * 80}>
              <span className="education-period">{edu.period}</span>
              <span className="education-name">{edu.name}</span>
              <small className="education-en">{edu.en}</small>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="content">
        <SectionHeading
          no="01"
          label="SCOREBOARD"
          title="数字不会说谎，"
          accent="但努力会"
          copy="绩点、标化与英语能力测试，是努力留下的可读痕迹。"
        />
        <MetricStrip metrics={stats} large />
      </section>

      <section className="content">
        <SectionHeading
          no="02"
          label="AP ARCHIVE"
          title="AP 成绩"
          accent="档案"
          copy="9 门 AP 全部 5 分，覆盖理科、社科与计算机；Grade 12 三门待出分。"
        />

        <div className="ap-panel">
          <div className="panel-label">AP SCORE / 2024—2026 · 9 门全部 5 分 · 3 门待出分</div>
          {apScores.map((row, i) => (
            <Reveal key={row.name} className={`ap-row ${row.status}`} delay={i * 40}>
              <span className="ap-no">{String(i + 1).padStart(2, '0')}</span>
              <div className="ap-main">
                <strong>{row.name}</strong>
                <small>{row.en} · {row.year}</small>
              </div>
              {row.status === 'done'
                ? <span className="ap-badge">{row.score}</span>
                : <span className="ap-badge"></span>}
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}
