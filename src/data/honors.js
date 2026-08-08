export const honorCategories = [
  { key: 'all', label: '全部' },
  { key: 'peak', label: '领航级', en: 'PIONEER' },
  { key: 'excellent', label: '卓越级', en: 'DISTINGUISHED' },
  { key: 'emerging', label: '新锐级', en: 'MERIT' }
]

export const honors = [
  {
    date: '2026.08', level: 'emerging', title: '第九届全国青少年人工智能创新挑战赛 · 三等奖',
    org: 'National Youth AI Innovation Challenge',
    detail: '国家级人工智能创新挑战赛，在算法设计与工程实现环节获得三等奖。'
  },
  {
    date: '2026.07', level: 'peak', title: 'TRAE AI 创意大赛 · Top 300',
    org: '约 14,000 参赛者',
    detail: '在约 14,000 名参赛者中进入前 300，提交了基于 AI 视觉的创意应用方案。'
  },
  {
    date: '2026.05', level: 'peak', title: '英国化学奥赛 UKChO · 全球金奖',
    org: 'UK Chemistry Olympiad',
    detail: 'UKChO 英国化学奥林匹克竞赛全球金奖，考察无机、有机、物理化学综合能力。'
  },
  {
    date: '2026.05', level: 'excellent', title: '美国生物奥赛 USABO · 全球银奖',
    org: 'USA Biology Olympiad',
    detail: 'USABO 美国生物奥林匹克竞赛全球银奖。'
  },
  {
    date: '2026.05', level: 'emerging', title: '加拿大化学竞赛 CCC · 全国铜奖',
    org: 'Canadian Chemistry Contest',
    detail: '加拿大化学竞赛（CCC）全国铜奖。'
  },
  {
    date: '2026.05', level: 'emerging', title: 'Senior Physics Challenge · 全球铜奖',
    org: 'UK Senior Physics Challenge',
    detail: '英国物理挑战赛全球铜奖。'
  },
  {
    date: '2026.03', level: 'peak', title: '英国生物奥赛 BBO · 全球金奖',
    org: 'British Biology Olympiad',
    detail: 'BBO 英国生物奥林匹克竞赛全球金奖。'
  },
  {
    date: '2026.03', level: 'emerging', title: 'iHOSA 全国轮 BCE · 全国优秀奖',
    org: 'iHOSA National Round',
    detail: 'iHOSA 全国轮 BCE（基础化学与生物）全国优秀奖。'
  },
  {
    date: '2026.03', level: 'excellent', title: '北京青少年科技创新大赛 · 二等奖',
    org: 'Beijing Adolescents S&T Innovation Contest',
    detail: '北京青少年科技创新大赛二等奖。'
  },
  {
    date: '2026.02', level: 'peak', title: 'USACO 2025-2026 赛季 · Gold Division',
    org: 'USA Computing Olympiad',
    detail: 'USACO 2025-2026 赛季金级别，算法与数据结构竞赛。'
  },
  {
    date: '2026.01', level: 'emerging', title: '北京朝阳青少年金鹏科技论坛 · 二等奖',
    org: 'Chaoyang Jinping Technology Forum',
    detail: '朝阳区金鹏科技论坛二等奖。'
  },
  {
    date: '2025.12', level: 'emerging', title: '北京朝阳青少年科技创新大赛 · 一等奖',
    org: 'Chaoyang Adolescents S&T Innovation Contest',
    detail: '朝阳区青少年科技创新大赛一等奖。'
  },
  {
    date: '2025.04', level: 'emerging', title: '加拿大化学竞赛 CCC · 区域优秀奖',
    org: 'Canadian Chemistry Contest',
    detail: '加拿大化学竞赛（CCC）区域优秀奖。'
  }
]

const honorStatMeta = [
  { level: 'all', label: '项荣誉', note: '2025 — 2026' },
  { level: 'peak', label: '领航级', note: 'UKChO · BBO · USACO · TRAE' },
  { level: 'excellent', label: '卓越级', note: 'USABO · 北京科创大赛' },
  { level: 'emerging', label: '新锐级', note: '国际 · 国家 · 区域' }
]

export const honorStats = honorStatMeta.map(({ level, label, note }) => ({
  value: String(level === 'all' ? honors.length : honors.filter((honor) => honor.level === level).length),
  label,
  note
}))

/* ---------- 研究项目（5 项，按时间倒序） ---------- */
