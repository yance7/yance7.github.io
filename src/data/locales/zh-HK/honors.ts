import type { HonorsLocaleCopy } from '../types.ts'

export const honorsCopy = {
  categories: [{ key: 'all', label: '全部' }, { key: 'international', label: '國際' }, { key: 'national', label: '全國' }, { key: 'regional', label: '省市級' }],
  scopeLabels: { international: '國際', national: '全國', regional: '省市級', pending: '待核驗' },
  statLabels: {
    all: { label: '項榮譽', note: '2025 — 2026' },
    international: { label: '國際', note: 'UKChO · BBO · USACO · TRAE' },
    national: { label: '全國', note: '全國 AI · BIO-USACN · iHOSA' },
    regional: { label: '省市級', note: '北京科創' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '第九屆全國青少年人工智能創新挑戰賽 · 三等獎', org: 'National Youth AI Innovation Challenge', evidence: '全國決賽近 8,000 名選手', source: 'https://aiic.china61.org.cn/' },
    'trae-ai-2026-top-350': { title: 'TRAE AI 創造力大賽 · Top 350', org: '約 14,000 名參賽者', evidence: '350 名晉級複賽', source: 'https://bytedance.larkoffice.com/wiki/DScwwZPzsikvNzk5slJc2kgpnie' },
    'ukcho-2026-gold': { title: '英國化學奧林匹克 UKChO · 金獎證書', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: 'BIO-USACN 生物競賽 · 全國銀獎', org: 'BioOlympiad Initiative USA-China (BIO-USACN)' },
    'ccc-2026-national-bronze': { title: '加拿大化學競賽 CCC · 全國銅獎', org: 'Canadian Chemistry Contest', evidence: '中國賽區 · 銅獎前 35%', source: 'https://ccc.ccolympiad.org.cn/' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · 全球銅獎', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: '英國生物奧林匹克 BBO · 全球金獎', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA 全國賽 BCE · 全國優秀獎', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: '北京第45屆青少年科技創新大賽 · 二等獎', org: 'Beijing Youth Science Creation Competition' },
    'usaco-2025-2026-gold': { title: 'USACO 2025-2026 賽季 · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: '北京朝陽青少年金鵬科技論壇 · 二等獎', org: 'Chaoyang Youth “Jinpeng” Science and Technology Forum' },
    'chaoyang-sti-2025-first': { title: '北京朝陽青少年科技創新大賽 · 一等獎', org: 'Chaoyang Youth Science and Technology Innovation Competition' },
    'ccc-2025-regional-excellence': { title: '加拿大化學競賽 CCC · 區域優秀獎', org: 'Canadian Chemistry Contest', evidence: '中國賽區 · 區域優秀獎前 20%（各賽區）', source: 'https://ccc.ccolympiad.org.cn/' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: '每一枚獎章，都是', accent: '向上的證據', copy: '獎項是座標，不是終點；真正重要的是仍然保持向上的慣性。' },
    archive: { label: 'ARCHIVE', titleSuffix: '枚', accent: '座標', copy: '按時間倒序排列，按國際、全國與省市級歸類；區級記錄列入待核驗清單。' },
    pending: { label: '待核驗', note: '賽事層級或來源待確認，保留在「全部」中。' }
  }
} satisfies HonorsLocaleCopy
