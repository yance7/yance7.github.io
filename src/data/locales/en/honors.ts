import type { HonorsLocaleCopy } from '../types.ts'

export const honorsCopy = {
  categories: [{ key: 'all', label: 'All' }, { key: 'international', label: 'International' }, { key: 'national', label: 'National' }, { key: 'regional', label: 'Provincial & municipal' }],
  scopeLabels: { international: 'International', national: 'National', regional: 'Provincial & municipal', pending: 'To verify' },
  statLabels: {
    all: { label: 'honors', note: '2025 — 2026' },
    international: { label: 'International', note: 'UKChO · BBO · USACO · TRAE' },
    national: { label: 'National', note: 'National AI · BIO-USACN · iHOSA · CCC national' },
    regional: { label: 'Provincial & municipal', note: 'Beijing science competition · CCC regional' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '9th National Youth AI Innovation Challenge · Third Prize', org: 'National Youth AI Innovation Challenge', evidence: '~8,000 national-final participants', source: 'https://aiic.china61.org.cn/' },
    'trae-ai-2026-top-350': { title: 'TRAE AI Creativity Competition · Top 350', org: 'Approximately 14,000 participants', evidence: 'Top 350 advanced to the semifinal', source: 'https://bytedance.larkoffice.com/wiki/DScwwZPzsikvNzk5slJc2kgpnie' },
    'ukcho-2026-gold': { title: 'UK Chemistry Olympiad (UKChO) · Gold Certificate', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: 'BioOlympiad Initiative USA-China (BIO-USACN) · National Silver Award', org: 'BioOlympiad Initiative USA-China (BIO-USACN)' },
    'ccc-2026-national-bronze': { title: 'Canadian Chemistry Contest (CCC) · National Bronze Award', org: 'Canadian Chemistry Contest', evidence: 'China region · national bronze, top 35%', source: 'https://ccc.ccolympiad.org.cn/' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · Global Bronze Award', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: 'British Biology Olympiad (BBO) · Global Gold Award', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA National Round BCE · National Excellence Award', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: '45th Beijing Youth Science Creation Competition · Second Prize', org: 'Beijing Youth Science Creation Competition' },
    'usaco-2025-2026-gold': { title: 'USACO 2025–2026 Season · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: 'Chaoyang Youth “Jinpeng” Science and Technology Forum · Second Prize', org: 'Chaoyang Youth “Jinpeng” Science and Technology Forum' },
    'chaoyang-sti-2025-first': { title: 'Chaoyang Youth Science and Technology Innovation Competition · First Prize', org: 'Chaoyang Youth Science and Technology Innovation Competition' },
    'ccc-2025-regional-excellence': { title: 'Canadian Chemistry Contest (CCC) · Regional Excellence Award', org: 'Canadian Chemistry Contest', evidence: 'China region · regional award, top 20% of each region', source: 'https://ccc.ccolympiad.org.cn/' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: 'Every award is', accent: 'evidence of motion', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    archive: { label: 'ARCHIVE', titleSuffix: 'honors', accent: 'on record', copy: 'Reverse chronological, grouped by international, national, and provincial/municipal scope; district-level records are listed for verification.' },
    pending: { label: 'To verify', note: 'Scope or source still needs confirmation; kept in All.' }
  }
} satisfies HonorsLocaleCopy
