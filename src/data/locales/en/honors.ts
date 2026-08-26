import type { HonorsLocaleCopy } from '../types'

export const honorsCopy = {
  categories: [{ key: 'all', label: 'All' }, { key: 'peak', label: 'Pioneer' }, { key: 'excellent', label: 'Distinguished' }, { key: 'emerging', label: 'Emerging' }],
  levelLabels: { peak: 'Pioneer', excellent: 'Distinguished', emerging: 'Emerging' },
  statLabels: {
    all: { label: 'honors', note: '2025 — 2026' },
    peak: { label: 'Pioneer', note: 'UKChO · BBO · USACO · TRAE' },
    excellent: { label: 'Distinguished', note: 'USABO · Beijing science contest' },
    emerging: { label: 'Emerging', note: 'International · national · regional' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '9th National Youth AI Innovation Challenge · Third Prize', org: 'National Youth AI Innovation Challenge' },
    'trae-ai-2026-top-300': { title: 'TRAE AI Creative Competition · Top 300', org: 'Approximately 14,000 entrants' },
    'ukcho-2026-gold': { title: 'UK Chemistry Olympiad (UKChO) · Global Gold Award', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: 'USA Biology Olympiad (USABO) · Global Silver Award', org: 'USA Biology Olympiad' },
    'ccc-2026-national-bronze': { title: 'Canadian Chemistry Contest (CCC) · National Bronze Award', org: 'Canadian Chemistry Contest' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · Global Bronze Award', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: 'British Biology Olympiad (BBO) · Global Gold Award', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA National Round BCE · National Excellence Award', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: 'Beijing Adolescents S&T Innovation Contest · Second Prize', org: 'Beijing Adolescents S&T Innovation Contest' },
    'usaco-2025-2026-gold': { title: 'USACO 2025–2026 Season · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: 'Chaoyang Jinping Technology Forum · Second Prize', org: 'Chaoyang Jinping Technology Forum' },
    'chaoyang-sti-2025-first': { title: 'Chaoyang Adolescents S&T Innovation Contest · First Prize', org: 'Chaoyang Adolescents S&T Innovation Contest' },
    'ccc-2025-regional-excellence': { title: 'Canadian Chemistry Contest (CCC) · Regional Excellence Award', org: 'Canadian Chemistry Contest' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: 'Every award is', accent: 'evidence of motion', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    archive: { label: 'ARCHIVE', titleSuffix: 'honors', accent: 'on record', copy: 'Reverse chronological, grouped into pioneer, distinguished, and emerging levels.' }
  }
} satisfies HonorsLocaleCopy
