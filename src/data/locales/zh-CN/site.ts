import type { SiteLocaleCopy } from '../types'

export const siteCopy = {
  pageMeta: {
    home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', copy: '这里收录研究、已上线的作品，以及被音乐和现场照亮的生活切片。先从一个真实问题开始，再沿着证据走到可以使用的结果。' },
    academics: { kicker: '学业', title: '明日从此的坐标', copy: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', credit: { artist: '林俊杰', song: '明日坐标', album: '明日坐标' } },
    honors: { kicker: '荣誉', title: '一步一步往上爬', copy: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', credit: { artist: '周杰伦', song: '蜗牛', album: 'Fantasy Plus' } },
    research: { kicker: '研究', title: '我不完美的梦，你陪着我想', copy: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' } },
    works: { kicker: '作品', title: '因为我已慢慢懂，努力就能成功', copy: '两个持续构建的小世界，记录想法如何离开纸面，成为可以使用或继续生长的成果。', credit: { artist: '汪苏泷', song: '慢慢懂', album: '慢慢懂' } },
    concerts: { kicker: '演唱会', title: '缘分让我们相遇乱世以外', copy: '演唱会足迹与海报，记录那些被灯光和合唱重新定义的夜晚。', credit: { artist: '邓紫棋', song: '光年之外', album: '' } }
  },
  nav: {
    home: { label: '首页', desc: '个人档案入口' },
    academics: { label: '学业', desc: '绩点、标化与 AP 成绩' },
    honors: { label: '荣誉', desc: '奖项与竞赛记录' },
    research: { label: '研究', desc: '从论文到产品' },
    works: { label: '作品', desc: '持续构建的项目与开放学习资源' },
    concerts: { label: '演唱会', desc: '现场记忆档案' }
  },
  worlds: {
    academics: { no: '01', label: '学业', icon: '✦', desc: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', accent: 'aqua' },
    honors: { no: '02', label: '荣誉', icon: '❖', desc: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', accent: 'violet' },
    research: { no: '03', label: '研究', icon: '◉', desc: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', accent: 'gold' },
    works: { no: '04', label: '作品', icon: '♬', desc: '2 个持续构建的小世界，记录想法如何离开纸面，成为可以使用或继续生长的成果。', accent: 'aqua' },
    concerts: { no: '05', label: '演唱会', icon: '♪', desc: '演唱会足迹与海报，记录那些被灯光和合唱重新定义的夜晚。', accent: 'gold' }
  },
  home: {
    heroTitle: '研究、构建，', heroAccent: '与现场相遇',
    selectedTitle: '研究如何', selectedAccent: '离开纸面', selectedCopy: '先看正在被继续推进的研究，再看已经可以打开使用的产品。',
    worldsTitle: '五个', worldsAccent: '小世界', worldsCopy: '把探索、荣誉、研究、作品与音乐分别收进五间屋子。',
    beyondTitle: '在集体中', beyondAccent: '继续生长', beyondCopy: '精选领导力与活动经历，保留那些最能说明组织、协作与行动力的片段。'
  }
} satisfies SiteLocaleCopy
