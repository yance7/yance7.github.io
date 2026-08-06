import { useRef, useState } from 'react'
import { worlds, leadership, activities } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import Reveal from '../components/Reveal.jsx'
import { useSpotlight } from '../hooks/useSpotlight'

function WorldCard({ w, i }) {
  const ref = useRef(null)
  useSpotlight(ref)
  return (
    <Reveal
      as="a"
      innerRef={ref}
      className={`world-card accent-${w.accent}`}
      href={w.href}
      style={{ '--wi': i }}
      delay={i * 80}
    >
      <div className="world-left">
        <span className="world-no">{w.no}</span>
        <span className="world-icon" aria-hidden="true">{w.icon}</span>
      </div>
      <div className="world-center">
        <strong>{w.label}</strong>
        <em>{w.en}</em>
        <p>{w.desc}</p>
      </div>
      <span className="world-arrow" aria-hidden="true">↗</span>
    </Reveal>
  )
}

function LeadershipCard({ item, i }) {
  const ref = useRef(null)
  useSpotlight(ref)
  return (
    <Reveal as="article" innerRef={ref} className="leadership-card" delay={i * 60}>
      <span className="leadership-role">{item.role}</span>
      <span className="leadership-org">{item.org}</span>
      <span className="leadership-period">{item.period}</span>
      {item.note && <p className="leadership-note">{item.note}</p>}
    </Reveal>
  )
}

function ActivityRow({ item, i, expanded, onToggle }) {
  return (
    <Reveal className={`activity-row ${expanded ? 'expanded' : ''}`} delay={i * 60}>
      <button
        className="activity-btn"
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="activity-period">{item.period}</span>
        <div className="activity-info">
          <strong>{item.title}</strong>
          <small>{item.org}</small>
        </div>
        <span className="activity-arrow" aria-hidden="true">↘</span>
      </button>
      {expanded && (
        <div className="activity-detail">
          <p>{item.detail}</p>
        </div>
      )}
    </Reveal>
  )
}

export default function HomePage() {
  const [expandedActivity, setExpandedActivity] = useState(null)

  return (
    <div className="page-home">
      <section className="content home-worlds">
        <SectionHeading
          no="01"
          label="EXPLORE"
          title="五个"
          accent="小世界"
          copy="缘分让我们相遇乱世以外。把探索、荣誉、研究、作品与音乐分别收进五间屋子。"
        />

        <div className="worlds-list">
          {worlds.map((w, i) => <WorldCard key={w.key} w={w} i={i} />)}
        </div>
      </section>

      <section className="content home-leadership">
        <SectionHeading
          no="02"
          label="LEADERSHIP"
          title="在集体中"
          accent="生长"
          copy="四个领导力职位，从副主席到主席、副社长到社长，从执行到组织。"
        />
        <div className="leadership-grid">
          {leadership.map((item, i) => <LeadershipCard key={item.role + item.org} item={item} i={i} />)}
        </div>
      </section>

      <section className="content home-activities">
        <SectionHeading
          no="03"
          label="ACTIVITIES"
          title="在行动中"
          accent="学习"
          copy="五段活动经历，从志愿服务到学术会议，从 AI 伦理到微积分教学。"
        />
        <div className="activity-list">
          {activities.map((item, i) => (
            <ActivityRow
              key={item.title}
              item={item}
              i={i}
              expanded={expandedActivity === i}
              onToggle={() => setExpandedActivity(expandedActivity === i ? null : i)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
