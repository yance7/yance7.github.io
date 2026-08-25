import type { HonorsLocaleCopy } from '../types'

export const honorsCopy = {
  categories: [{ key: 'all', label: '全部' }, { key: 'peak', label: '領航級' }, { key: 'excellent', label: '卓越級' }, { key: 'emerging', label: '新銳級' }],
  levelLabels: { peak: '領航級', excellent: '卓越級', emerging: '新銳級' },
  statLabels: {
    all: { label: '項榮譽', note: '2025 — 2026' },
    peak: { label: '領航級', note: 'UKChO · BBO · USACO · TRAE' },
    excellent: { label: '卓越級', note: 'USABO · 北京科創大賽' },
    emerging: { label: '新銳級', note: '國際 · 國家 · 區域' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '第九屆全國青少年人工智能創新挑戰賽 · 三等獎', org: 'National Youth AI Innovation Challenge' },
    'trae-ai-2026-top-300': { title: 'TRAE AI 創意大賽 · Top 300', org: '約 14,000 名參賽者' },
    'ukcho-2026-gold': { title: '英國化學奧林匹克 UKChO · 全球金獎', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: '美國生物奧林匹克 USABO · 全球銀獎', org: 'USA Biology Olympiad' },
    'ccc-2026-national-bronze': { title: '加拿大化學競賽 CCC · 全國銅獎', org: 'Canadian Chemistry Contest' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · 全球銅獎', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: '英國生物奧林匹克 BBO · 全球金獎', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA 全國賽 BCE · 全國優秀獎', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: '北京青少年科技創新大賽 · 二等獎', org: 'Beijing Adolescents S&T Innovation Contest' },
    'usaco-2025-2026-gold': { title: 'USACO 2025-2026 賽季 · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: '北京朝陽青少年金鵬科技論壇 · 二等獎', org: 'Chaoyang Jinping Technology Forum' },
    'chaoyang-sti-2025-first': { title: '北京朝陽青少年科技創新大賽 · 一等獎', org: 'Chaoyang Adolescents S&T Innovation Contest' },
    'ccc-2025-regional-excellence': { title: '加拿大化學競賽 CCC · 區域優秀獎', org: 'Canadian Chemistry Contest' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: '每一枚獎章，都是', accent: '向上的證據', copy: '獎項是座標，不是終點；真正重要的是仍然保持向上的慣性。' },
    archive: { label: 'ARCHIVE', titleSuffix: '枚', accent: '座標', copy: '按時間倒序排列，分為領航、卓越與新銳三檔。' }
  }
} satisfies HonorsLocaleCopy
