import { concerts } from '../../concerts'
import type { ConcertLocaleCopy } from '../types'

export const concertsCopy = {
  entities: Object.fromEntries(concerts.map((item) => [item.id, { artist: item.artist, tour: item.tour, venue: item.venue }])) as ConcertLocaleCopy['entities'],
  moods: { '2024': '第一次走进鸟巢，灯光亮起的瞬间，世界安静了。', '2025': '从春到冬，五场现场，五次被音乐重新定义的夜晚。' },
  currentYearMood: (attended, upcoming) => `${attended} 場已赴約，${upcoming} 場待相見。`,
  section: { label: 'LIVE ARCHIVE', title: '现场是', accent: '另一种记忆', copy: '点击海报进入全屏档案。每张图都保留原始比例，轮播记录同一场演出的不同视觉。', nextUp: 'NEXT UP', realTime: '现实时间', archive: '演唱会档案', posterArchive: '打开档案', attended: '已赴约', upcoming: '待相见', venues: '场馆', artists: '艺人', posters: '张海报', total: '总现场', recorded: '已记录的演出', showUnit: '场' }
} satisfies ConcertLocaleCopy
