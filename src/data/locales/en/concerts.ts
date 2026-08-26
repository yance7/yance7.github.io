import { concerts } from '../../concerts'
import type { ConcertLocaleCopy } from '../types'

const base = Object.fromEntries(concerts.map((item) => [item.id, { artist: item.artist, tour: item.tour, venue: item.venue }])) as ConcertLocaleCopy['entities']

export const concertsCopy = {
  entities: {
    ...base,
    'dengziqi-2024-08-25': { artist: 'G.E.M.', tour: 'I AM GLORIA Live', venue: 'National Stadium' },
    'zhangjie-2025-04-18': { artist: 'Jason Zhang', tour: '未·Live — Kai Wang 1982', venue: 'National Stadium' },
    'xietingfeng-2025-08-10': { artist: 'Nicholas Tse', tour: 'Evolution Nic Live', venue: 'Big Lotus' },
    'taozhe-2025-09-19': { artist: 'David Tao', tour: 'Soul Power II Live', venue: 'National Stadium' },
    'zhangyixing-2025-10-06': { artist: 'Lay Zhang', tour: 'Grand Voyage 5', venue: 'National Stadium' },
    'kpl-2025-11-08': { artist: 'KPL Grand Finals', tour: 'KPL Annual Finals 2025', venue: 'National Stadium' },
    'huangzihongfan-2026-03-14': { artist: 'Vio Huang', tour: 'OPEN WORLD Live', venue: 'National Stadium' },
    'zhangjie-2026-04-19': { artist: 'Jason Zhang', tour: '未·Live — Kai Wang 1982', venue: 'National Stadium' },
    'mayday-2026-05-15': { artist: 'Mayday', tour: '5525 + 2 Back to That Day', venue: 'National Stadium' },
    'jd-summer-2026-05-31': { artist: 'JD 618 Summer Concert', tour: 'JD 618 Summer Concert', venue: 'Beijing Workers Stadium' },
    'zhoujielun-2026-06-26': { artist: 'Jay Chou', tour: 'Dragon Fist · Beijing Carnival 2026', venue: 'National Stadium' },
    'xuezhiqian-2026-07-26': { artist: 'Joker Xue', tour: 'King of Beasts Live', venue: 'National Stadium' },
    'wangsulong-2026-08-19': { artist: 'Silence Wang', tour: 'Tomorrow World Live', venue: 'National Stadium' },
    'wangsulong-2026-08-30': { artist: 'Silence Wang', tour: 'Tomorrow World Live', venue: 'National Stadium' }
  },
  moods: { '2024': 'The first time I entered the National Stadium, the world went quiet when the lights came up.', '2025': 'Five shows from spring to winter—five nights that reset the scale of the world.' },
  currentYearMood: (attended, upcoming) => `${attended} attended, ${upcoming} upcoming.`,
  section: { label: 'LIVE ARCHIVE', title: 'Live shows are', accent: 'another kind of memory', copy: 'Open a poster for the full archive. Original proportions stay intact; a carousel keeps the different views from one night together.', nextUp: 'NEXT UP', realTime: 'REAL TIME', archive: 'CONCERT ARCHIVE', posterArchive: 'OPEN ARCHIVE', attended: 'ATTENDED', upcoming: 'UPCOMING', venues: 'venues', artists: 'artists', posters: 'posters', total: 'total shows', recorded: 'shows logged', showUnit: 'shows' }
} satisfies ConcertLocaleCopy
