import { projects } from '../../projects'
import type { ProjectLocaleCopy, ProjectCopy } from '../types'

const base = Object.fromEntries(projects.map((item) => [item.id, {
  title: item.title, value: item.value, description: item.description, role: item.role, discipline: item.discipline, story: item.story
}])) as Record<string, ProjectCopy>

export const projectsCopy = {
  entities: {
    ...base,
    fresheye: {
      ...base.fresheye!,
      title: 'FreshEye',
      value: 'Move fish freshness assessment from the lab into daily use.',
      description: 'A browser product that takes a fish-eye image and returns a freshness class, confidence score, and Grad-CAM heatmap.',
      role: 'Full-stack development · Model training · UI design',
      discipline: 'COMPUTER VISION / WEB PRODUCT',
      story: {
        label: 'FROM RESEARCH TO PRODUCT',
        note: 'I kept pushing one model experiment until it became a tool anyone could open.',
        chapters: [
          { label: '01 / QUESTION', title: 'Move freshness assessment beyond the lab', detail: 'Traditional assessment depends on manual judgment or lab methods; daily use needs a faster, reviewable entry point.' },
          { label: '02 / MODEL', title: 'FishFreshNet V2', detail: '99.29% accuracy · 4.095M parameters', href: 'research.html#fishfreshnet-v2' },
          { label: '03 / DELIVERY', title: 'From inference to an explainable report', detail: 'Confidence, Grad-CAM heatmaps, and PDF export form one complete decision flow.' }
        ],
        sequenceLabel: 'PRODUCT FLOW', sequence: ['Upload', 'Inference', 'Confidence', 'Grad-CAM', 'PDF'],
        proof: [{ type: 'deployment', label: 'LIVE PRODUCT', value: 'fresheye.yance777.com', href: 'https://fresheye.yance777.com', external: true }, { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true }]
      }
    }
  },
  section: { label: 'RELEASED WORLDS', title: 'Turn ideas', accent: 'into something usable', copySingular: 'A deployed small world showing how an idea leaves the page and meets real use.', copyPlural: 'Deployed small worlds showing how ideas leave the page and meet real use.' }
} satisfies ProjectLocaleCopy
