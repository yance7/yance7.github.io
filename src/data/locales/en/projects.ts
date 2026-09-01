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
    },
    'ap-microeconomics-notes': {
      ...base['ap-microeconomics-notes']!,
      title: 'AP Microeconomics Notes',
      value: 'Turn concepts, graphs, and practice into one maintainable path for learning, review, and verification.',
      description: 'An open Chinese-language AP Microeconomics study archive with structured course modules, economic diagrams, multiple-choice practice, FRQs, and worked explanations.',
      role: 'Content authoring · Curriculum design · Chart and build tooling',
      discipline: 'ECONOMICS EDUCATION / OPEN KNOWLEDGE',
      story: {
        label: 'FROM COURSEWORK TO OPEN NOTES',
        note: 'I organized scattered concepts, diagrams, and questions into an open study archive that can be maintained and reviewed as one system.',
        chapters: [
          { label: '01 / CURRICULUM', title: 'Eight connected learning modules', detail: 'From the course overview through markets, firm behavior, factor markets, market failure, and worked answers.' },
          { label: '02 / VISUALIZATION', title: '39 economic diagrams', detail: 'Maintainable scripts generate supply, demand, cost, market-structure, and policy-analysis diagrams.' },
          { label: '03 / PRACTICE', title: '60 MCQs, FRQs, and explanations', detail: 'Questions and answers share the same unit and numbering structure for immediate review.' }
        ],
        sequenceLabel: 'LEARNING LOOP', sequence: ['Learn', 'Model', 'Practice', 'Review'],
        proof: [{ type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/ap-microeconomics-notes', external: true }]
      }
    }
  },
  section: { label: 'RELEASED WORLDS', title: 'Turn ideas', accent: 'into something usable', copySingular: 'An evolving project world showing how an idea leaves the page and becomes something useful or keeps growing.', copyPlural: 'evolving project worlds showing how ideas leave the page and become products or open learning resources.' }
} satisfies ProjectLocaleCopy
