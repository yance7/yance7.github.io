import { useState } from 'react'
import StatusBadge from './StatusBadge.jsx'
import CopyCitation from './CopyCitation.jsx'
import Reveal from './Reveal.jsx'

const METHOD_KEYS = ['question', 'hypothesis', 'method', 'prototype', 'result', 'next']

function tagClass(tag) {
  if (tag.includes('WEB TOOL')) return 'aqua'
  if (tag.includes('PUBLISHED')) return 'gold'
  if (tag.includes('DEEP')) return 'violet'
  if (tag.includes('MULTIMODAL')) return 'violet'
  return 'dim'
}

function statusLabel(status) {
  return { active: '进行中', published: '已发表', completed: '已完成' }[status] || ''
}

export default function TimelineTrack({ items }) {
  const [openMethod, setOpenMethod] = useState({})

  function toggleMethod(title) {
    setOpenMethod((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <div className="timeline-track">
      <div className="tl-rail" aria-hidden="true"></div>
      {items.map((item) => (
        <Reveal
          as="article"
          key={item.title}
          className={`tl-item ${item.status === 'active' ? 'active' : ''}`}
        >
          <div className="tl-side">
            <span className="tl-date">{item.date}</span>
            {item.status && <StatusBadge status={item.status} label={statusLabel(item.status)} />}
          </div>
          <span className="tl-node" aria-hidden="true"><i></i></span>
          <div className="tl-body">
            <span className={`tl-tag ${tagClass(item.tag)}`}>{item.tag}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>

            {item.metrics && (
              <div className="tl-metrics">
                {item.metrics.map((m) => (
                  <div className="metric-item" key={m.label}>
                    <strong>{m.value}</strong>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {item.methodology && (
              <div className="tl-method">
                <button
                  className={`method-toggle ${openMethod[item.title] ? 'open' : ''}`}
                  type="button"
                  aria-expanded={!!openMethod[item.title]}
                  onClick={() => toggleMethod(item.title)}
                >
                  {openMethod[item.title] ? '收起方法论' : '展开方法论'}
                </button>
                <div className={`method-grid ${openMethod[item.title] ? 'open' : ''}`}>
                  {METHOD_KEYS.map((key) => (
                    <div className="method-cell" key={key}>
                      <span className="method-label">{key.toUpperCase()}</span>
                      <p>{item.methodology[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tl-foot">
              <div className="tl-foot-meta">
                <span className="tl-org">{item.org}</span>
                {item.paper && <span className="tl-doi">DOI · {item.paper.doi}</span>}
              </div>
              <div className="tl-actions">
                {item.citation && <CopyCitation citation={item.citation} />}
                {item.paper && (
                  <a className="tl-link" href={item.paper.href} target="_blank" rel="noopener">
                    READ PAPER <span className="tl-paper-tag">{item.paper.tag}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
                {item.link && (
                  <a className="tl-link" href={item.link} target="_blank" rel="noopener">
                    OPEN PROJECT <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
