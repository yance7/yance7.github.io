import type { Honor, HonorLevel } from './types'

export const honorCategories = [
  { key: 'all', label: '全部' },
  { key: 'peak', label: '领航级', en: 'PIONEER' },
  { key: 'excellent', label: '卓越级', en: 'DISTINGUISHED' },
  { key: 'emerging', label: '新锐级', en: 'EMERGING' }
] satisfies Array<{ key: 'all' | HonorLevel; label: string; en?: string }>

export const honors = [
  {
    id: 'ai-innovation-2026-third', date: '2026.08', level: 'emerging', title: '第九届全国青少年人工智能创新挑战赛 · 三等奖',
    org: 'National Youth AI Innovation Challenge'
  },
  {
    id: 'trae-ai-2026-top-350', date: '2026.07', level: 'peak', title: 'TRAE AI 创造力大赛 · Top 350',
    org: '约 14,000 份作品'
  },
  {
    id: 'ukcho-2026-gold', date: '2026.05', level: 'peak', title: '英国化学奥赛 UKChO · 全球金奖',
    org: 'UK Chemistry Olympiad'
  },
  {
    id: 'usabo-2026-silver', date: '2026.05', level: 'excellent', title: '美国生物奥赛 USABO · 全球银奖',
    org: 'USA Biology Olympiad'
  },
  {
    id: 'ccc-2026-national-bronze', date: '2026.05', level: 'emerging', title: '加拿大化学竞赛 CCC · 全国铜奖',
    org: 'Canadian Chemistry Contest'
  },
  {
    id: 'senior-physics-2026-bronze', date: '2026.05', level: 'emerging', title: 'Senior Physics Challenge · 全球铜奖',
    org: 'UK Senior Physics Challenge'
  },
  {
    id: 'bbo-2026-gold', date: '2026.03', level: 'peak', title: '英国生物奥赛 BBO · 全球金奖',
    org: 'British Biology Olympiad'
  },
  {
    id: 'ihosa-2026-bce-excellence', date: '2026.03', level: 'emerging', title: 'iHOSA 全国轮 BCE · 全国优秀奖',
    org: 'iHOSA National Round'
  },
  {
    id: 'beijing-sti-2026-second', date: '2026.03', level: 'excellent', title: '北京青少年科技创新大赛 · 二等奖',
    org: 'Beijing Adolescents S&T Innovation Contest'
  },
  {
    id: 'usaco-2025-2026-gold', date: '2026.02', level: 'peak', title: 'USACO 2025-2026 赛季 · Gold Division',
    org: 'USA Computing Olympiad'
  },
  {
    id: 'chaoyang-jinpeng-2026-second', date: '2026.01', level: 'emerging', title: '北京朝阳青少年金鹏科技论坛 · 二等奖',
    org: 'Chaoyang Jinping Technology Forum'
  },
  {
    id: 'chaoyang-sti-2025-first', date: '2025.12', level: 'emerging', title: '北京朝阳青少年科技创新大赛 · 一等奖',
    org: 'Chaoyang Adolescents S&T Innovation Contest'
  },
  {
    id: 'ccc-2025-regional-excellence', date: '2025.04', level: 'emerging', title: '加拿大化学竞赛 CCC · 区域优秀奖',
    org: 'Canadian Chemistry Contest'
  }
] satisfies Honor[]

const honorStatMeta = [
  { level: 'all', label: '项荣誉', note: '2025 — 2026' },
  { level: 'peak', label: '领航级', note: 'UKChO · BBO · USACO · TRAE' },
  { level: 'excellent', label: '卓越级', note: 'USABO · 北京科创大赛' },
  { level: 'emerging', label: '新锐级', note: '国际 · 国家 · 区域' }
] satisfies Array<{ level: 'all' | HonorLevel; label: string; note: string }>

export const honorsUpdatedAt = '2026-08-08'

export const honorStats = honorStatMeta.map(({ level, label, note }) => ({
  value: String(level === 'all' ? honors.length : honors.filter((honor) => honor.level === level).length),
  label,
  note
}))

/* ---------- 研究项目（5 项，按时间倒序） ---------- */
