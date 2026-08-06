import { useRef } from 'react'
import SectionHeading from '../components/SectionHeading.jsx'
import { useMagnetic } from '../hooks/useMagnetic'

export default function NotFoundPage() {
  const homeRef = useRef(null)
  const researchRef = useRef(null)
  useMagnetic(homeRef)
  useMagnetic(researchRef)

  return (
    <div className="page-404">
      <section className="content error-content">
        <SectionHeading
          no="!"
          label="SIGNAL LOST"
          title="这一页，"
          accent="走丢了。"
          copy="你访问的页面不存在，或者已经被移走。回到主页，重新选一间屋子走进去。"
        />
        <div className="error-actions">
          <a ref={homeRef} className="btn-primary" href="index.html">回到首页 <span aria-hidden="true">→</span></a>
          <a ref={researchRef} className="btn-ghost" href="research.html">去看看研究 <span aria-hidden="true">→</span></a>
        </div>
      </section>
    </div>
  )
}
