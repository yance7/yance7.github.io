import { pageEntries, pageRegistry, type PageKey } from './pageRegistry'
import type { PageMeta, SiteNavItem, Status, World } from './types'

export const navItems = pageEntries.map(({ key }) => ({
  key,
  href: pageRegistry[key].href,
  ...pageRegistry[key].nav
})) satisfies SiteNavItem[]

export const statusLabels = {
  active: '进行中',
  published: '已发表',
  completed: '已完成',
  deployed: '已部署',
  'open-source': '开放源码',
  planned: '计划中',
  archived: '已归档'
} satisfies Record<Status, string>

/* ---------- 标化成绩 ---------- */

/* ---------- 首页页面元数据 ---------- */
export const pageMeta = {
  home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', copy: '这里收录研究、已上线的作品，以及被音乐和现场照亮的生活切片。先从一个真实问题开始，再沿着证据走到可以使用的结果。', credit: undefined },
  academics: { kicker: 'ACADEMICS / 学业', title: '明日从此的坐标', copy: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', credit: { artist: '林俊杰', song: '明日坐标', album: '明日坐标' } },
  honors: { kicker: 'HONORS / 荣誉', title: '一步一步往上爬', copy: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', credit: { artist: '周杰伦', song: '蜗牛', album: 'Fantasy Plus' } },
  research: { kicker: 'RESEARCH / 研究', title: '我不完美的梦，你陪着我想', copy: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' } },
  works: { kicker: 'WORKS / 作品', title: '因为我已慢慢懂，努力就能成功', copy: '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。', credit: { artist: '汪苏泷', song: '慢慢懂', album: '慢慢懂' } },
  concerts: { kicker: 'CONCERTS / 演唱会', title: '缘分让我们相遇乱世以外', copy: '演唱会足迹与海报，记录那些被灯光和合唱重新定义的夜晚。', credit: { artist: '邓紫棋', song: '光年之外', album: '' } }
} satisfies Record<PageKey, PageMeta>

/* ---------- 首页五个小世界入口数据 ---------- */

const worldsCopy = [
  { key: 'academics', no: '01', label: '学业', en: 'Academics', icon: '✦', desc: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', accent: 'aqua' },
  { key: 'honors', no: '02', label: '荣誉', en: 'Honors', icon: '❖', desc: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', accent: 'violet' },
  { key: 'research', no: '03', label: '研究', en: 'Research', icon: '◉', desc: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', accent: 'gold' },
  { key: 'works', no: '04', label: '作品', en: 'Works', icon: '♬', desc: '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。', accent: 'aqua' },
  { key: 'concerts', no: '05', label: '演唱会', en: 'Concerts', icon: '♪', desc: '演唱会足迹与海报，记录那些被灯光和合唱重新定义的夜晚。', accent: 'gold' }
] satisfies Array<Omit<World, 'href'>>

export const worlds = worldsCopy.map((world) => ({
  ...world,
  href: pageRegistry[world.key].href
})) satisfies World[]
