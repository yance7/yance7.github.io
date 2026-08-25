import { honorCategories, honors } from '../../honors'
import type { HonorsLocaleCopy } from '../types'

export const honorsCopy = {
  categories: honorCategories.map(({ key, label }) => ({ key, label })),
  levelLabels: { peak: '领航级', excellent: '卓越级', emerging: '新锐级' },
  statLabels: {
    all: { label: '项荣誉', note: '2025 — 2026' },
    peak: { label: '领航级', note: 'UKChO · BBO · USACO · TRAE' },
    excellent: { label: '卓越级', note: 'USABO · 北京科创大赛' },
    emerging: { label: '新锐级', note: '国际 · 国家 · 区域' }
  },
  entities: Object.fromEntries(honors.map((item) => [item.id, { title: item.title, org: item.org }])),
  sections: {
    milestones: { label: 'MILESTONES', title: '每一枚奖章，都是', accent: '向上的证据', copy: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。' },
    archive: { label: 'ARCHIVE', titleSuffix: '枚', accent: '坐标', copy: '按时间倒序排列，分为领航、卓越与新锐三档。' }
  }
} satisfies HonorsLocaleCopy
