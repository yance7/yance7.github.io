import Reveal from './Reveal.jsx'

export default function SectionHeading({ no, label, title, accent = '', copy = '' }) {
  return (
    <Reveal className="section-head">
      <span className="section-no">{no}</span>
      <p className="section-label">{label}</p>
      <h2>{title}{accent && <span className="accent">{accent}</span>}</h2>
      {copy && <p className="section-copy">{copy}</p>}
    </Reveal>
  )
}
