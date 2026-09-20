import type { HonorsLocaleCopy } from '../types.ts'

export const honorsCopy = {
  categories: [{ key: 'all', label: 'All' }, { key: 'peak', label: 'Pioneer tier' }, { key: 'excellent', label: 'Distinguished tier' }, { key: 'emerging', label: 'Emerging tier' }],
  levelLabels: { peak: 'Pioneer tier', excellent: 'Distinguished tier', emerging: 'Emerging tier' },
  statLabels: {
    all: { label: 'honors', note: '2025 — 2026' },
    peak: { label: 'Pioneer tier', note: 'UKChO · BBO · USACO · TRAE' },
    excellent: { label: 'Distinguished tier', note: 'USABO · Beijing science competition' },
    emerging: { label: 'Emerging tier', note: 'International · national · regional' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '9th National Youth AI Innovation Challenge · Third Prize', org: 'National Youth AI Innovation Challenge' },
    'trae-ai-2026-top-350': { title: 'TRAE AI Creativity Competition · Top 350', org: 'Approximately 14,000 submissions' },
    'ukcho-2026-gold': { title: 'UK Chemistry Olympiad (UKChO) · Global Gold Award', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: 'USA Biology Olympiad (USABO) · Global Silver Award', org: 'USA Biology Olympiad' },
    'ccc-2026-national-bronze': { title: 'Canadian Chemistry Contest (CCC) · National Bronze Award', org: 'Canadian Chemistry Contest' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · Global Bronze Award', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: 'British Biology Olympiad (BBO) · Global Gold Award', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA National Round BCE · National Excellence Award', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: 'Beijing Youth Science Creation Competition · Second Prize', org: 'Beijing Youth Science Creation Competition' },
    'usaco-2025-2026-gold': { title: 'USACO 2025–2026 Season · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: 'Chaoyang Youth “Jinpeng” Science and Technology Forum · Second Prize', org: 'Chaoyang Youth “Jinpeng” Science and Technology Forum' },
    'chaoyang-sti-2025-first': { title: 'Chaoyang Youth Science and Technology Innovation Competition · First Prize', org: 'Chaoyang Youth Science and Technology Innovation Competition' },
    'ccc-2025-regional-excellence': { title: 'Canadian Chemistry Contest (CCC) · Regional Excellence Award', org: 'Canadian Chemistry Contest' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: 'Every award is', accent: 'evidence of motion', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    archive: { label: 'ARCHIVE', titleSuffix: 'honors', accent: 'on record', copy: 'Reverse chronological, grouped into the site\'s Pioneer, Distinguished, and Emerging tiers.' }
  }
} satisfies HonorsLocaleCopy
