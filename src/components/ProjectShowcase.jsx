import { useRef } from 'react'
import Reveal from './Reveal.jsx'
import { useSpotlight } from '../hooks/useSpotlight'
import { useMagnetic } from '../hooks/useMagnetic'

export default function ProjectShowcase({ project, index = 0 }) {
  const rootRef = useRef(null)
  const enterRef = useRef(null)
  const githubRef = useRef(null)
  useSpotlight(rootRef)
  useMagnetic(enterRef)
  useMagnetic(githubRef)

  return (
    <Reveal
      as="article"
      innerRef={rootRef}
      className={`showcase ${project.tone}`}
    >
      <div className="sc-frame" aria-hidden="true">
        <div className="sc-frame-bar">
          <i></i><i></i><i></i>
          <span>{project.domain}</span>
        </div>
        <div className="sc-frame-body">
          <span className="sc-icon">{project.icon === 'eye' ? '◉' : '♫'}</span>
        </div>
      </div>

      <div className="sc-content">
        <div className="sc-top">
          <span className="sc-overline">PROJECT 0{index + 1}</span>
          <span className="sc-domain">{project.domain}</span>
        </div>

        <h3>{project.title} <small>{project.en}</small></h3>

        <p className="sc-value">{project.value}</p>
        <p className="sc-desc">{project.description}</p>

        <div className="sc-meta">
          <div className="sc-role">
            <span className="sc-meta-label">ROLE</span>
            <span>{project.role}</span>
          </div>
          <div className="sc-stack">
            <span className="sc-meta-label">STACK</span>
            <div className="sc-tags">
              {project.stack.map((tech) => <span key={tech} className="sc-tag">{tech}</span>)}
            </div>
          </div>
        </div>

        <div className="sc-actions">
          <a ref={enterRef} className="btn-primary" href={project.href} target="_blank" rel="noopener">
            ENTER PROJECT <span aria-hidden="true">→</span>
          </a>
          {project.github && (
            <a ref={githubRef} className="btn-ghost" href={project.github} target="_blank" rel="noopener">
              GITHUB <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </Reveal>
  )
}
