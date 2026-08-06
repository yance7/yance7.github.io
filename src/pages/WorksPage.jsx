import { projects } from '../data/content'
import SectionHeading from '../components/SectionHeading.jsx'
import ProjectShowcase from '../components/ProjectShowcase.jsx'

export default function WorksPage() {
  return (
    <div className="page-works">
      <section className="content">
        <SectionHeading
          no="01"
          label="RELEASED WORLDS"
          title="让想法"
          accent="可以被打开。"
          copy="两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。"
        />

        <div className="showcase-list">
          {projects.map((project, i) => (
            <ProjectShowcase key={project.title} project={project} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
