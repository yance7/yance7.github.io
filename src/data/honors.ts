import type { Honor, HonorFilter } from './types.ts'

export const honorCategories = [
  { key: 'all', label: '全部', en: 'ALL' },
  { key: 'international', label: '国际', en: 'INTERNATIONAL' },
  { key: 'national', label: '全国', en: 'NATIONAL' },
  { key: 'regional', label: '省市级', en: 'PROVINCIAL & MUNICIPAL' }
] satisfies Array<{ key: HonorFilter; label: string; en?: string }>

export const honors = [
  {
    id: 'ai-innovation-2026-third', date: '2026.08', scope: 'national', title: '第九届全国青少年人工智能创新挑战赛 · 三等奖',
    org: 'National Youth AI Innovation Challenge'
  },
  {
    id: 'trae-ai-2026-top-350', date: '2026.07', scope: 'international', title: 'TRAE AI 创造力大赛 · Top 350',
    org: '约 14,000 名参赛者'
  },
  {
    id: 'ukcho-2026-gold', date: '2026.05', scope: 'international', title: '英国化学奥赛 UKChO · 金奖证书',
    org: 'UK Chemistry Olympiad'
  },
  {
    id: 'usabo-2026-silver', date: '2026.05', scope: 'national', title: 'BIO-USACN 生物竞赛 · 全国银奖',
    org: 'BioOlympiad Initiative USA-China (BIO-USACN)'
  },
  {
    id: 'ccc-2026-national-bronze', date: '2026.05', scope: 'national', title: '加拿大化学竞赛 CCC · 全国铜奖',
    org: 'Canadian Chemistry Contest'
  },
  {
    id: 'senior-physics-2026-bronze', date: '2026.05', scope: 'international', title: 'Senior Physics Challenge · 全球铜奖',
    org: 'UK Senior Physics Challenge'
  },
  {
    id: 'bbo-2026-gold', date: '2026.03', scope: 'international', title: '英国生物奥赛 BBO · 全球金奖',
    org: 'British Biology Olympiad'
  },
  {
    id: 'ihosa-2026-bce-excellence', date: '2026.03', scope: 'national', title: 'iHOSA 全国轮 BCE · 全国优秀奖',
    org: 'iHOSA National Round'
  },
  {
    id: 'beijing-sti-2026-second', date: '2026.03', scope: 'regional', title: '北京第45届青少年科技创新大赛 · 二等奖',
    org: 'Beijing Youth Science Creation Competition'
  },
  {
    id: 'usaco-2025-2026-gold', date: '2026.02', scope: 'international', title: 'USACO 2025-2026 赛季 · Gold Division',
    org: 'USA Computing Olympiad'
  },
  {
    id: 'chaoyang-jinpeng-2026-second', date: '2026.01', scope: 'pending', title: '北京朝阳青少年金鹏科技论坛 · 二等奖',
    org: 'Chaoyang Youth “Jinpeng” Science and Technology Forum'
  },
  {
    id: 'chaoyang-sti-2025-first', date: '2025.12', scope: 'pending', title: '北京朝阳青少年科技创新大赛 · 一等奖',
    org: 'Chaoyang Youth Science and Technology Innovation Competition'
  },
  {
    id: 'ccc-2025-regional-excellence', date: '2025.04', scope: 'regional', title: '加拿大化学竞赛 CCC · 区域优秀奖',
    org: 'Canadian Chemistry Contest'
  }
] satisfies Honor[]

const honorStatMeta = [
  { scope: 'all', label: '项荣誉', note: '2025 — 2026' },
  { scope: 'international', label: '国际', note: 'UKChO · BBO · USACO · TRAE' },
  { scope: 'national', label: '全国', note: '全国 AI · BIO-USACN · iHOSA · CCC 全国' },
  { scope: 'regional', label: '省市级', note: '北京科创 · CCC 区域' }
] satisfies Array<{ scope: HonorFilter; label: string; note: string }>

export const honorsUpdatedAt = '2026-11-21'

export const honorStats = honorStatMeta.map(({ scope, label, note }) => ({
  value: String(scope === 'all' ? honors.length : honors.filter((honor) => honor.scope === scope).length),
  label,
  note
}))

/* ---------- 研究项目（5 项，按时间倒序） ---------- */
