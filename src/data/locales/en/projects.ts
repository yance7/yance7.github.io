import { projects } from '../../projects.ts'
import type { ProjectLocaleCopy, ProjectCopy } from '../types.ts'

const base = Object.fromEntries(projects.map((item) => [item.id, {
  title: item.title, value: item.value, description: item.description, role: item.role, discipline: item.discipline, story: item.story
}])) as Record<string, ProjectCopy>

export const projectsCopy = {
  entities: {
    ...base,
    fresheye: {
      ...base.fresheye!,
      title: 'FreshEye',
      value: 'Make fish-eye freshness screening accessible through a reviewable web tool.',
      description: 'A zero-install aid for fish-eye freshness screening, with a class, confidence, Grad-CAM heatmap, four-tab report, A4 PDF export, and searchable local history.',
      role: 'Full-stack development · Model training · UI design',
      discipline: 'COMPUTER VISION / WEB PRODUCT',
      story: {
        label: 'FROM RESEARCH TO PRODUCT',
        note: 'I extended a research workflow into an accessible aid for fish-eye freshness screening.',
        chapters: [
          { label: '01 / QUESTION', title: 'Make fish-eye screening accessible', detail: 'A zero-install web entry point helps users review a freshness-screening result and its explanation.' },
          { label: '02 / MODEL', title: 'FishFreshNet V2', detail: '99.29% accuracy · 4.095M parameters · five MFED runs', href: '/research/#fishfreshnet-v2' },
          { label: '03 / DELIVERY', title: 'From result to a reviewable report', detail: 'Confidence, Grad-CAM, a four-tab report, and A4 PDF export support result review.' }
        ],
        sequenceLabel: 'PRODUCT FLOW', sequence: ['Upload', 'Inference', 'Confidence', 'Grad-CAM', 'PDF'],
        proof: [{ type: 'deployment', label: 'LIVE PRODUCT', value: 'fresheye.yance.me', href: 'https://fresheye.yance.me', external: true }, { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true }]
      }
    },
    'trusted-garden': {
      ...base['trusted-garden']!,
      title: 'Trusted Garden',
      value: 'Explore a 3D farm reference scene through view changes, weather states, and roaming.',
      description: 'A 3D farm reference scene built with Three.js, TypeScript, and Vite, with camera view changes, weather states, and scene roaming. Models and textures are delivered from the same site; console readouts are simulated display values.',
      role: 'Personal project · 3D scene and web interaction',
      discipline: '3D WEB / INTERACTIVE SCENE',
      story: {
        label: '3D FARM REFERENCE SCENE',
        note: 'Explore a digital farm scene through camera views, weather states, and roaming.',
        chapters: [
          { label: '01 / SCENE', title: 'Build a 3D farm scene', detail: 'A Three.js, TypeScript, and Vite reference scene with models and textures delivered from the same site.' },
          { label: '02 / INTERACTION', title: 'Change views and weather', detail: 'Switch camera views, inspect weather states, and roam through the scene.' },
          { label: '03 / READOUT', title: 'Read simulated values', detail: 'Console readouts in the information panel are simulated display values.' }
        ],
        sequenceLabel: 'SCENE EXPLORATION', sequence: ['Scene', 'Views', 'Weather', 'Roam'],
        proof: []
      }
    },
    'ap-microeconomics-notes': {
      ...base['ap-microeconomics-notes']!,
      title: 'AP Micro Notes',
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
