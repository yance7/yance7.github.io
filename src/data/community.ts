import type { Activity, Leadership } from './types.ts'

export const leadership = [
  { role: '社长', org: 'iHOSA 科技创新社', period: '2025.09 — 2026.09', note: '' },
  { role: '副社长', org: '生物社', period: '2025.09 — 2026.09', note: '' },
  { role: '主席', org: '学生自主管理委员会', period: '2025.09 — 2026.09', note: '负责面向国际部 712 名学生的卫生检查、每周值班和宣传工作。' },
  { role: '副主席', org: '学生自主管理委员会', period: '2024.09 — 2025.09', note: '' }
] satisfies Leadership[]

/* ---------- 活动经历 ---------- */
export const activities = [
  {
    id: 'low-carbon-volunteer',
    featured: true,
    title: '"保护地球，低碳生活" 志愿活动', period: '2024.03 — 2026.09',
    org: '北京志愿服务联合会',
    detail: '累计 72 小时志愿服务，制作社交媒体视频推广有机果蔬与节能理念。'
  },
  {
    id: 'pioneer-analyzing-ai',
    featured: false,
    title: 'Pioneer 全球问题解决研究院', period: '2024.09 — 2024.12',
    org: 'Pioneer Global · 课程：Analyzing AI',
    detail: '教授评分 A-。完成关于创新作业如何帮助高中生在借助 AI 学习的同时抵制学术不端的报告，探讨学习设计如何支持负责任地使用 AI。'
  },
  {
    id: 'pioneer-research-institute',
    featured: true,
    title: 'Pioneer 研究院', period: '2025.06 — 2025.08',
    org: 'Pioneer Research Institute · 计算中的批判意识',
    detail: '研究题目：Applying Value-Sensitive Design to Agricultural Drones: An Evaluation System for Farmers。方向为 Critical Consciousness in Computing，教授评分 A+；使用 SUS 量表进行量化评估并形成闭环。'
  },
  {
    id: 'academic-report-forum',
    featured: false,
    title: '北京市第八十中学学术报告会（第六届 & 第七届）', period: '2025.12 & 2026.06',
    org: 'Beijing No. 80 High School',
    detail: '连续两届介绍 CNN/ResNet、注意力机制与多模态学习相关研究。'
  },
  {
    id: 'ap-calculus-assistant',
    featured: true,
    title: 'AP 微积分 BC 助教', period: '2025.11 — 2026.04',
    org: 'Teaching Assistant',
    detail: '辅导同学微分方程、泰勒级数等概念；编写 70 页 AP 微积分 BC 学习手册。'
  }
] satisfies Activity[]

/* ---------- 作品 Showcase ---------- */
