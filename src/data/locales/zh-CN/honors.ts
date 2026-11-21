import { honorCategories } from '../../honors.ts'
import type { HonorsLocaleCopy } from '../types.ts'

export const honorsCopy = {
  categories: honorCategories.map(({ key, label }) => ({ key, label })),
  scopeLabels: { international: '国际', national: '全国', regional: '省市级', pending: '待核验' },
  statLabels: {
    all: { label: '项荣誉', note: '2025 — 2026' },
    international: { label: '国际', note: 'UKChO · BBO · USACO · TRAE' },
    national: { label: '全国', note: '全国 AI · BIO-USACN · iHOSA' },
    regional: { label: '省市级', note: '北京科创' }
  },
  entities: {
    'ai-innovation-2026-third': { title: '第九届全国青少年人工智能创新挑战赛 · 三等奖', org: 'National Youth AI Innovation Challenge', evidence: '全国决赛近 8,000 名选手', source: 'https://aiic.china61.org.cn/' },
    'trae-ai-2026-top-350': { title: 'TRAE AI 创造力大赛 · Top 350', org: '约 14,000 名参赛者', evidence: '350 名晋级复赛', source: 'https://bytedance.larkoffice.com/wiki/DScwwZPzsikvNzk5slJc2kgpnie' },
    'ukcho-2026-gold': { title: '英国化学奥赛 UKChO · 金奖证书', org: 'UK Chemistry Olympiad' },
    'usabo-2026-silver': { title: 'BIO-USACN 生物竞赛 · 全国银奖', org: 'BioOlympiad Initiative USA-China (BIO-USACN)' },
    'ccc-2026-national-bronze': { title: '加拿大化学竞赛 CCC · 全国铜奖', org: 'Canadian Chemistry Contest', evidence: '中国赛区 · 铜奖前 35%', source: 'https://ccc.ccolympiad.org.cn/' },
    'senior-physics-2026-bronze': { title: 'Senior Physics Challenge · 全球铜奖', org: 'UK Senior Physics Challenge' },
    'bbo-2026-gold': { title: '英国生物奥赛 BBO · 全球金奖', org: 'British Biology Olympiad' },
    'ihosa-2026-bce-excellence': { title: 'iHOSA 全国轮 BCE · 全国优秀奖', org: 'iHOSA National Round' },
    'beijing-sti-2026-second': { title: '北京第45届青少年科技创新大赛 · 二等奖', org: 'Beijing Youth Science Creation Competition' },
    'usaco-2025-2026-gold': { title: 'USACO 2025-2026 赛季 · Gold Division', org: 'USA Computing Olympiad' },
    'chaoyang-jinpeng-2026-second': { title: '北京朝阳青少年金鹏科技论坛 · 二等奖', org: 'Chaoyang Youth “Jinpeng” Science and Technology Forum' },
    'chaoyang-sti-2025-first': { title: '北京朝阳青少年科技创新大赛 · 一等奖', org: 'Chaoyang Youth Science and Technology Innovation Competition' },
    'ccc-2025-regional-excellence': { title: '加拿大化学竞赛 CCC · 区域优秀奖', org: 'Canadian Chemistry Contest', evidence: '中国赛区 · 区域优秀奖前 20%（各赛区）', source: 'https://ccc.ccolympiad.org.cn/' }
  },
  sections: {
    milestones: { label: 'MILESTONES', title: '每一枚奖章，都是', accent: '向上的证据', copy: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。' },
    archive: { label: 'ARCHIVE', titleSuffix: '枚', accent: '坐标', copy: '按时间倒序排列，按国际、全国与省市级归类；区级记录列入待核验清单。' },
    pending: { label: '待核验', note: '赛事层级或来源待确认，保留在「全部」中。' }
  }
} satisfies HonorsLocaleCopy
