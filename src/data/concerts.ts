import type { Concert } from './types.ts'

export const concerts = [
  { id: 'dengziqi-2024-08-25', date: '2024-08-25', artist: '邓紫棋', tour: 'I AM GLORIA 演唱会', venue: '鸟巢', poster: { file: 'concert-20240825-deng-ziqi.jpg', width: 1746, height: 2560 } },
  { id: 'zhangjie-2025-04-18', date: '2025-04-18', artist: '张杰', tour: '未·Live — 开往1982', venue: '鸟巢', poster: { file: 'concert-20250418-zhang-jie.jpg', width: 1829, height: 2560 } },
  { id: 'xietingfeng-2025-08-10', date: '2025-08-10', artist: '谢霆锋', tour: 'Evolution Nic Live 进化演唱会', venue: '大莲花', poster: { file: 'concert-20250810-xie-tingfeng.jpg', width: 1819, height: 2560 } },
  { id: 'taozhe-2025-09-19', date: '2025-09-19', artist: '陶喆', tour: 'Soul Power Ⅱ 演唱会', venue: '鸟巢', poster: { file: 'concert-20250919-tao-zhe.jpg', width: 1811, height: 2560 } },
  { id: 'zhangyixing-2025-10-06', date: '2025-10-06', artist: '张艺兴', tour: '大航海5 · 美猴王闹天宫', venue: '鸟巢', poster: { file: 'concert-20251006-zhang-yixing.jpg', width: 1720, height: 2560 } },
  { id: 'kpl-2025-11-08', date: '2025-11-08', artist: 'KPL 总决赛', tour: 'KPL Annual Finals 2025', venue: '鸟巢', poster: { file: 'concert-20251108-kpl-finals.jpg', width: 2560, height: 1408 } },
  { id: 'huangzihongfan-2026-03-14', date: '2026-03-14', artist: '黄子弘凡', tour: 'OPEN WORLD 开放世界', venue: '鸟巢', poster: { file: 'concert-20260314-huang-zihongfan.jpg', width: 1920, height: 2560 } },
  { id: 'zhangjie-2026-04-19', date: '2026-04-19', artist: '张杰', tour: '未·Live — 开往1982', venue: '鸟巢', poster: { file: 'concert-20260419-zhang-jie.jpg', width: 1828, height: 2560 } },
  { id: 'mayday-2026-05-15', date: '2026-05-15', artist: '五月天', tour: '5525 + 2 回到那一天', venue: '鸟巢', poster: { file: 'concert-20260515-mayday.jpg', width: 1920, height: 2560 } },
  { id: 'jd-summer-2026-05-31', date: '2026-05-31', artist: '京东 618 夏日歌会', tour: 'JD 618 Summer Concert', venue: '北京工人体育场', poster: { file: 'concert-20260531-jd-618-summer.jpg', width: 1247, height: 2560 } },
  { id: 'zhoujielun-2026-06-26', date: '2026-06-26', artist: '周杰伦', tour: '龙拳 · 北京嘉年华 2026', venue: '鸟巢', poster: { file: 'concert-20260626-zhou-jielun.jpg', width: 1810, height: 2560 } },
  { id: 'xuezhiqian-2026-07-26', date: '2026-07-26', artist: '薛之谦', tour: '万兽之王演唱会', venue: '鸟巢', poster: { file: 'concert-20260726-xue-zhiqian.jpg', width: 1920, height: 2560 } },
  { id: 'wangsulong-2026-08-19', date: '2026-08-19', artist: '汪苏泷', tour: '明日世界演唱会', venue: '鸟巢', poster: { file: 'concert-202608-wang-sulong.jpg', width: 1799, height: 2560 } },
  { id: 'wangsulong-2026-08-30', date: '2026-08-30', artist: '汪苏泷', tour: '明日世界演唱会', venue: '鸟巢', poster: { file: 'concert-202608-wang-sulong.jpg', width: 1799, height: 2560 } },
  { id: 'zhou-shen-2026-09-27', date: '2026-09-27', artist: '周深', tour: '2026「深深的」巡回演唱会', venue: '鸟巢', poster: { file: 'concert-20260927-zhou-shen.jpg', width: 1923, height: 2560 } },
  { id: 'fforever-2026-10-06', date: '2026-10-06', artist: 'FFOREVER', tour: '「恒星之城」银河加冕 · 北京限定场演唱会', venue: '鸟巢', poster: { file: 'concert-20261006-fforever.jpg', width: 1684, height: 2245 } }
] satisfies Concert[]

export const concertsUpdatedAt = '2026-09-21'

/* 按年份分组 */
export function isConcertUpcoming(concert: Concert, now = new Date()) {
  return new Date(`${concert.date}T23:59:59+08:00`) > now
}

export const concertGroups = concerts.reduce<Record<string, Concert[]>>((groups, item) => {
  const year = item.date.split('-')[0]
  if (!year) return groups
  const group = groups[year] ?? (groups[year] = [])
  group.push(item)
  return groups
}, {})

const baseConcertMoods = {
  '2024': '第一次走进鸟巢，灯光亮起的瞬间，世界安静了。',
  '2025': '从春到冬，五场现场，五次被音乐重新定义的夜晚。'
}

const concertVenues = [...new Set(concerts.map((concert) => concert.venue))]
const concertArtists = [...new Set(concerts.map((concert) => concert.artist))]
const concertPosters = new Set(concerts.map((concert) => concert.poster.file))

export function getConcertState(now = new Date()) {
  const upcoming = concerts
    .filter((concert) => isConcertUpcoming(concert, now))
    .sort((a, b) => a.date.localeCompare(b.date))
  const attended = concerts.filter((concert) => !isConcertUpcoming(concert, now))
  const attended2026 = attended.filter((concert) => concert.date.startsWith('2026-')).length
  const upcoming2026 = upcoming.filter((concert) => concert.date.startsWith('2026-')).length

  return {
    now,
    upcoming,
    moods: {
      ...baseConcertMoods,
      '2026': `${attended2026} 场已赴约，${upcoming2026} 场待相见。`
    },
    stats: {
      total: concerts.length,
      attended: attended.length,
      upcoming: upcoming.length,
      venues: concertVenues.join(' / '),
      artistCount: concertArtists.length,
      posterCount: concertPosters.size
    },
    venueCount: concertVenues.length
  }
}
