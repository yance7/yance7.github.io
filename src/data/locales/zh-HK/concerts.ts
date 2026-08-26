import { concerts } from '../../concerts'
import type { ConcertLocaleCopy } from '../types'

const base = Object.fromEntries(concerts.map((item) => [item.id, { artist: item.artist, tour: item.tour, venue: item.venue }])) as ConcertLocaleCopy['entities']

export const concertsCopy = {
  entities: {
    ...base,
    'dengziqi-2024-08-25': { artist: '鄧紫棋', tour: 'I AM GLORIA 演唱會', venue: '鳥巢' },
    'zhangjie-2025-04-18': { artist: '張杰', tour: '未·Live — 開往1982', venue: '鳥巢' },
    'xietingfeng-2025-08-10': { artist: '謝霆鋒', tour: 'Evolution Nic Live 進化演唱會', venue: '大蓮花' },
    'taozhe-2025-09-19': { artist: '陶喆', tour: 'Soul Power Ⅱ 演唱會', venue: '鳥巢' },
    'zhangyixing-2025-10-06': { artist: '張藝興', tour: '大航海5 · 美猴王鬧天宮', venue: '鳥巢' },
    'kpl-2025-11-08': { artist: 'KPL 總決賽', tour: 'KPL Annual Finals 2025', venue: '鳥巢' },
    'huangzihongfan-2026-03-14': { artist: '黃子弘凡', tour: 'OPEN WORLD 開放世界', venue: '鳥巢' },
    'zhangjie-2026-04-19': { artist: '張杰', tour: '未·Live — 開往1982', venue: '鳥巢' },
    'mayday-2026-05-15': { artist: '五月天', tour: '5525 + 2 回到那一天', venue: '鳥巢' },
    'jd-summer-2026-05-31': { artist: '京東 618 夏日歌會', tour: 'JD 618 Summer Concert', venue: '北京工人體育場' },
    'zhoujielun-2026-06-26': { artist: '周杰倫', tour: '龍拳 · 北京嘉年華 2026', venue: '鳥巢' },
    'xuezhiqian-2026-07-26': { artist: '薛之謙', tour: '萬獸之王演唱會', venue: '鳥巢' },
    'wangsulong-2026-08-19': { artist: '汪蘇瀧', tour: '明日世界演唱會', venue: '鳥巢' },
    'wangsulong-2026-08-30': { artist: '汪蘇瀧', tour: '明日世界演唱會', venue: '鳥巢' }
  },
  moods: { '2024': '第一次走進鳥巢，燈光亮起的瞬間，世界安靜了。', '2025': '從春到冬，五場現場，五次被音樂重新定義的夜晚。' },
  currentYearMood: (attended, upcoming) => `${attended} 場已赴約，${upcoming} 場待相見。`,
  section: { label: 'LIVE ARCHIVE', title: '現場是', accent: '另一種記憶', copy: '點擊海報進入全屏檔案。每張圖都保留原始比例，輪播記錄同一場演出的不同視覺。', nextUp: 'NEXT UP', realTime: '現實時間', archive: '演唱會檔案', posterArchive: '開啟檔案', attended: '已赴約', upcoming: '待相見', venues: '場館', artists: '藝人', posters: '張海報', total: '總現場', recorded: '已記錄的演出', showUnit: '場' }
} satisfies ConcertLocaleCopy
