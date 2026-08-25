import type { UiMessages } from '../types'

export const zhCNMessages = {
  navigation: { main: '主导航', mobile: '移动端导航', home: '首页', openMenu: '打开导航', closeMenu: '关闭导航' },
  theme: { light: '亮色', dark: '暗色', switchToLight: '切换到亮色主题', switchToDark: '切换到暗色主题' },
  locale: { selector: '语言选择', zhCN: '简', zhHK: '繁', en: 'EN', switchToZhCN: '当前语言：简体中文', switchToZhHK: '切换至繁體中文', switchToEnglish: 'Switch to English' },
  compass: { label: '页面章节罗盘', open: '展开章节导航', close: '收起章节导航', progress: '页面阅读进度', returnTop: '回到顶部', current: '当前', goToSection: '前往章节', read: '阅读' },
  accessibility: { skipToMain: '跳到主要内容', home: '返回首页', footerHome: '返回个人档案首页', liveProduct: '打开产品网站', projectStory: '项目故事' },
  common: { online: '在线', current: '当前', previous: '上一张', next: '下一张', readPaper: '阅读论文', openProject: '打开项目', proof: '证据', source: '源码', deployedAs: '上线为', liveProduct: '在线产品', project: '项目', projectNote: '项目说明', chapters: '章节', proofLinks: '证据 / 链接', role: '角色', stack: '技术栈', single: '单曲', copyCitation: '复制引用', copyInProgress: '复制中…', copied: '已复制', copyFailed: '复制失败，请手动复制' },
  actions: { selectedWork: '查看精选作品', exploreWorlds: '浏览五个小世界', scrollToExplore: '滚动探索', readResearch: '阅读研究', viewCaseStudy: '查看产品案例', exploreAcademics: '探索学业', viewHonors: '查看荣誉', enterProject: '进入项目', sourceCode: '源码', openResearch: '打开研究' },
  home: { identity: '研究者 / 构建者 / 音乐听众', researchLabel: '研究', selectedWorkLabel: '精选作品', productLabel: '产品', researchToProduct: '研究 → 产品', exploreLabel: '探索', worldsDescription: '把探索、荣誉、研究、作品与音乐分别收进五间屋子。', beyondLabel: '实验室之外', leadership: '领导力', selectedActivities: '精选活动' },
  research: { expandMethodology: '展开方法论', collapseMethodology: '收起方法论', question: '问题', hypothesis: '假设', method: '方法', prototype: '原型', result: '结果', next: '下一步', workbench: '研究工作台', toolsInRotation: '轮换中的工具', researchLoopActive: '研究循环进行中', questionToEvidenceToProduct: '问题 → 证据 → 产品', toolsCount: '工具', methodsLabel: '方法与技术栈' },
  honors: { filterLabel: '荣誉分类筛选', all: '全部', peak: '领航级', excellent: '卓越级', emerging: '新锐级', honorsUnit: '项荣誉' },
  lightbox: { gallery: '演唱会海报大图', close: '关闭灯箱', previous: '上一张', next: '下一张', loading: '正在加载图片', failed: '图片加载失败', retry: '重试', posterAlt: '海报', openArchive: '打开档案' },
  albums: { collection: '专辑收藏墙', navigation: '专辑切换控制', previous: '上一张专辑', next: '下一张专辑', select: '选择一张专辑', selected: '已选择', nowSpinning: '正在播放', album: '专辑', ep: 'EP' },
  footer: { profile: '个人档案', researchRepos: '研究仓库', contact: '联系', archive: '个人档案 / 2026', identity: '研究者 / 构建者 / 音乐听众' },
  error404: { kicker: '信号丢失', title: '这一页走丢了', copy: '你访问的页面不存在，或者已经被移走。回到主页，重新选一间屋子走进去。', home: '回到首页', research: '去看看研究' },
  loadError: { title: '页面暂时无法加载', copy: '当前页面资源没有完成加载，请刷新后重试。', retry: '重新加载' },
  status: { active: '进行中', published: '已发表', completed: '已完成', deployed: '已部署', 'open-source': '开放源码', planned: '计划中', archived: '已归档' },
  page: {
    home: { kicker: '个人档案 / 北京 · 2026', title: 'SONG NOTES', copy: '这里收录研究、已上线的作品，以及被音乐和现场照亮的生活切片。先从一个真实问题开始，再沿着证据走到可以使用的结果。' },
    academics: { kicker: '学业', title: '明日从此的坐标', copy: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。' },
    honors: { kicker: '荣誉', title: '一步一步往上爬', copy: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。' },
    research: { kicker: '研究', title: '我不完美的梦，你陪着我想', copy: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。' },
    works: { kicker: '作品', title: '因为我已慢慢懂，努力就能成功', copy: '一个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。' },
    concerts: { kicker: '演唱会', title: '缘分让我们相遇乱世以外', copy: '演唱会足迹与海报，记录那些被灯光和合唱重新定义的夜晚。' }
  }
} satisfies UiMessages
