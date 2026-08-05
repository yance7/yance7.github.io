/* ==========================================================================
   双生档案馆 2.0 · 内容数据
   ========================================================================== */

export const navItems = [
  { key: 'home', label: '首页', en: 'Home', href: 'index.html', desc: '个人档案入口' },
  { key: 'academics', label: '学业', en: 'Academics', href: 'academics.html', desc: '绩点、标化与 AP 成绩' },
  { key: 'honors', label: '荣誉', en: 'Honors', href: 'honors.html', desc: '奖项与竞赛记录' },
  { key: 'research', label: '研究', en: 'Research', href: 'research.html', desc: '从论文到产品' },
  { key: 'works', label: '作品', en: 'Works', href: 'works.html', desc: '已上线的项目' },
  { key: 'concerts', label: '演唱会', en: 'Concerts', href: 'concerts.html', desc: '现场记忆档案' }
]

export const stats = [
  { value: '4.0', label: 'GPA', note: '未加权满分绩点' },
  { value: '1490', label: 'SAT', note: '数学 800 · 语文 690' },
  { value: '9', label: 'AP 5分', note: '全部满分通过' },
  { value: '108', label: 'TOEFL', note: '学术英语能力' }
]

/* ---------- 学业轨迹 ---------- */
export const academicTimeline = [
  {
    year: '2024',
    phase: 'Foundation',
    en: '基础阶段',
    items: ['进入国际课程体系', '开始 AP 微积分 BC 与物理 1 学习', '首次 TOEFL 108 分']
  },
  {
    year: '2025',
    phase: 'AP / SAT / TOEFL',
    en: '标化集中期',
    items: ['3 门 AP 全部 5 分', 'SAT 1490（数学 800）', '完成计算机科学 A']
  },
  {
    year: '2026',
    phase: 'Research-oriented',
    en: '研究导向',
    items: ['6 门 AP 进行中', 'FishFreshNet 论文发表', 'FreshEye 工具上线']
  }
]

export const apScores = [
  { name: '微积分 BC', en: 'Calculus BC', year: '2025', score: 5 },
  { name: '物理 1', en: 'Physics 1', year: '2025', score: 5 },
  { name: '计算机科学 A', en: 'Computer Science A', year: '2025', score: 5 },
  { name: '生物学', en: 'Biology', year: '2026', score: 5 },
  { name: '化学', en: 'Chemistry', year: '2026', score: 5 },
  { name: '统计学', en: 'Statistics', year: '2026', score: 5 },
  { name: '环境科学', en: 'Environmental Science', year: '2026', score: 5 },
  { name: '心理学', en: 'Psychology', year: '2026', score: 5 },
  { name: '宏观经济学', en: 'Macroeconomics', year: '2026', score: 5 }
]

/* ---------- 荣誉奖章册 ---------- */
export const honorCategories = [
  { key: 'all', label: '全部' },
  { key: 'gold', label: '国际金牌' },
  { key: 'aqua', label: '卓越银章' },
  { key: 'violet', label: '稳步积累' }
]

export const honors = [
  {
    level: 'I', title: '国际金牌', en: 'PREMIER', color: 'gold', category: 'gold',
    items: [
      { text: 'TRAE AI 创意大赛 · Top 300 / 约 14,000', detail: '在约 14,000 名参赛者中进入前 300，提交了基于 AI 视觉的创意应用方案。' },
      { text: '英国化学奥赛 · 全球金奖', detail: 'UKChO 英国化学奥林匹克竞赛，全球金奖。' },
      { text: '英国生物奥赛 · 全球金奖', detail: 'BBO 英国生物奥林匹克竞赛，全球金奖。' },
      { text: '国际化学竞赛 · 金奖', detail: 'International Chemistry Olympiad 金奖。' }
    ]
  },
  {
    level: 'II', title: '卓越银章', en: 'DISTINGUISHED', color: 'aqua', category: 'aqua',
    items: [
      { text: '全国中学生物理竞赛 · 省级一等奖', detail: 'CPhO 全国中学生物理竞赛省级一等奖。' },
      { text: '全国中学生数学竞赛 · 省级一等奖', detail: 'CMO 全国中学生数学竞赛省级一等奖。' },
      { text: 'USACO · Gold Division', detail: 'USA Computing Olympiad 金级别。' },
      { text: '国际计算机竞赛 · 银奖', detail: 'International Olympiad in Informatics 银奖。' }
    ]
  },
  {
    level: 'III', title: '稳步积累', en: 'MERIT', color: 'violet', category: 'violet',
    items: [
      { text: '科技创新项目 · 优秀奖', detail: '校级科技创新项目评选优秀奖。' },
      { text: '校级学术研究奖', detail: '年度学术研究成果校级表彰。' },
      { text: '综合素质发展奖', detail: '全面发展综合素质表彰。' },
      { text: '社区科学传播志愿者', detail: '参与社区科普传播志愿服务。' }
    ]
  }
]

/* ---------- 研究实验室 ---------- */
export const research = [
  {
    date: '2026.04 — 至今',
    tag: 'WEB TOOL',
    status: 'active',
    title: '鲜眸 FreshEye：水产品新鲜度 AI 智能评估',
    org: '个人项目 · HuggingFace Spaces + GitHub Pages',
    text: '将 FishFreshNet 研究线转化为零安装网页工具，用户上传鱼眼照片即可获得新鲜度等级、置信度与 Grad-CAM 热力图。',
    link: 'https://fresheye.yance777.com',
    methodology: {
      question: '如何让水产品新鲜度评估从实验室走向日常使用？',
      hypothesis: '轻量化 CNN 配合 Grad-CAM 可视化，能在浏览器端实现实时、可解释的新鲜度分级。',
      method: 'FishFreshNet V2 模型 + ONNX 推理 + 前端 Grad-CAM 热力图渲染',
      prototype: 'HuggingFace Spaces 部署，零安装网页工具',
      result: '99.29% 准确率，推理延迟 < 200ms',
      next: '移动端适配 + 多品种鱼类支持'
    }
  },
  {
    date: '2026.04 — 2026.06',
    tag: 'DEEP LEARNING',
    status: 'published',
    title: 'FishFreshNet V2：轻量化可解释水产品新鲜度评估',
    org: '个人项目 · FishFreshNet V2',
    text: '引入环形区域注意力 LightCRA 与 ECA，实现 99.29% 准确率，同时保持轻量化部署能力。',
    link: 'https://github.com/yance7/FishFreshNetV2',
    methodology: {
      question: '如何在保持轻量化的同时提升鱼眼新鲜度分类的可解释性？',
      hypothesis: '环形区域注意力机制能捕捉鱼眼虹膜的径向退化特征，配合 ECA 通道注意力提升判别力。',
      method: 'LightCRA 模块 + ECA 通道注意力 + Grad-CAM 可视化分析',
      prototype: 'PyTorch 实现，在 MFED 数据集上训练与验证',
      result: '99.29% 准确率，模型体积 < 8MB',
      next: '部署为网页工具 FreshEye'
    }
  },
  {
    date: '2026.02 — 2026.04',
    tag: 'PUBLISHED · ICIPAI 2026',
    status: 'published',
    title: 'FishFreshNet V1：基于注意力机制的评估框架',
    org: '国际会议论文 · FishFreshNet V1',
    text: '构建多阶段鱼眼数据集 MFED，结合 CBAM 与 Grad-CAM 完成轻量化、可解释的新鲜度分级。',
    link: 'https://github.com/yance7/FishFreshNetV1',
    methodology: {
      question: '如何利用鱼眼图像实现自动化、可解释的水产品新鲜度分级？',
      hypothesis: 'CBAM 注意力机制能有效聚焦鱼眼虹膜纹理变化区域，配合 Grad-CAM 提供可解释性。',
      method: 'CBAM 注意力 + Grad-CAM + 多阶段鱼眼数据集 MFED',
      prototype: '论文投稿 ICIPAI 2026',
      result: '论文被接收，准确率 97.8%',
      next: '升级为 V2 版本，引入环形区域注意力'
    }
  },
  {
    date: '2025.07 — 2025.12',
    tag: 'MULTIMODAL',
    status: 'completed',
    title: '基于多模态特征融合的鱼类摄食强度评估',
    org: '个人研究 · 数字渔业',
    text: '融合音频与视觉信息，探索水下环境中鱼类行为识别与摄食强度评估。',
    methodology: {
      question: '如何利用多模态信息评估鱼类摄食强度？',
      hypothesis: '音频特征与视觉特征的融合能比单一模态更准确地判断摄食强度。',
      method: '音频频谱分析 + 视觉行为识别 + 多模态融合网络',
      prototype: '实验验证阶段',
      result: '完成数据采集与初步模型训练',
      next: '扩展数据集并优化融合策略'
    }
  }
]

export const researchMethods = [
  { label: 'PyTorch', en: 'Deep Learning Framework' },
  { label: 'ONNX', en: 'Model Deployment' },
  { label: 'Grad-CAM', en: 'Interpretability' },
  { label: 'HuggingFace Spaces', en: 'Web Deployment' },
  { label: 'GitHub Pages', en: 'Static Hosting' },
  { label: 'FastAPI', en: 'Backend API' }
]

/* ---------- 作品 Showcase ---------- */
export const projects = [
  {
    title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance777.com', tone: 'aqua', icon: 'eye',
    description: '上传鱼眼照片，AI 评估水产品新鲜度，输出等级、置信度与 Grad-CAM 热力图。',
    value: '让水产品新鲜度评估从实验室走向日常使用。',
    role: '全栈开发 · 模型训练 · UI 设计',
    stack: ['PyTorch', 'ONNX', 'Vue 3', 'HuggingFace Spaces'],
    href: 'https://fresheye.yance777.com',
    github: 'https://github.com/yance7/FishFreshNetV2'
  },
  {
    title: '余响', en: 'Encore', domain: 'encore.yance777.com', tone: 'gold', icon: 'note',
    description: '记录演唱会足迹，把每一站灯光与合唱收进属于音乐的屋子。',
    value: '把散落的演唱会记忆收进一个可以反复打开的档案。',
    role: '前端开发 · UI 设计 · 内容策划',
    stack: ['Vue 3', 'Vite', 'GitHub Pages'],
    href: 'https://encore.yance777.com',
    github: 'https://github.com/yance7/encore'
  }
]

/* ---------- 演唱会记忆档案 ---------- */
export const concerts = [
  ['2024.08.25', '邓紫棋', 'I AM GLORIA 演唱会', '鸟巢', ['concert-202408-deng-ziqi.jpg']],
  ['2025.04.18', '张杰', '未·Live — 开往1982', '鸟巢', ['concert-202504-zhang-jie.jpg']],
  ['2025.08.10', '谢霆锋', 'Evolution Nic Live 进化演唱会', '大莲花', ['concert-202508-xie-tingfeng.jpg']],
  ['2025.09.19', '陶喆', 'Soul Power Ⅱ 演唱会', '鸟巢', ['concert-202509-tao-zhe.jpg']],
  ['2025.10.06', '张艺兴', '大航海5 · 美猴王闹天宫', '鸟巢', ['concert-202510-zhang-yixing-01.jpg', 'concert-202510-zhang-yixing-02.jpg']],
  ['2025.11.08', 'KPL 总决赛', 'KPL Annual Finals 2025', '鸟巢', ['concert-202511-kpl-01.jpg', 'concert-202511-kpl-02.jpg', 'concert-202511-kpl-03.jpg'], true],
  ['2026.03.14', '黄子弘凡', 'OPEN WORLD 开放世界', '鸟巢', ['concert-202603-huang-zihongfan.jpg']],
  ['2026.04.19', '张杰', '未·Live — 开往1982', '鸟巢', ['concert-202604-zhang-jie.jpg']],
  ['2026.05.15', '五月天', '5525 + 2 回到那一天', '鸟巢', ['concert-202605-mayday.jpg']],
  ['2026.05.31', '京东 618 夏日歌会', 'JD 618 Summer Concert', '北京工人体育场', ['concert-202605-summer-01.jpg', 'concert-202605-summer-02.jpg']],
  ['2026.06.26', '周杰伦', '龙拳 · 北京嘉年华 2026', '鸟巢', ['concert-202606-zhou-jielun.jpg']],
  ['2026.07.26', '薛之谦', '万兽之王演唱会', '鸟巢', ['concert-202607-xue-zhiqian.jpg']],
  ['2026.08.19', '汪苏泷', '明日世界演唱会', '鸟巢', ['concert-202608-wang-sulong.jpg']],
  ['2026.08.30', '汪苏泷', '明日世界演唱会', '鸟巢', ['concert-202608-wang-sulong.jpg']]
].map(([date, artist, tour, venue, images, land = false]) => ({ date, artist, tour, venue, images, land }))

/* 按年份分组 */
export const concertGroups = concerts.reduce((groups, item) => {
  const year = item.date.split('.')[0]
  if (!groups[year]) groups[year] = []
  groups[year].push(item)
  return groups
}, {})

export const concertMoods = {
  '2024': '第一次走进鸟巢，灯光亮起的瞬间，世界安静了。',
  '2025': '从春到冬，五场现场，五次被音乐重新定义的夜晚。',
  '2026': '上半年八场，音乐成为生活节奏的一部分。'
}

export const concertStats = {
  total: concerts.length,
  venues: '鸟巢 / 大莲花 / 工人体育场',
  artists: '邓紫棋 · 张杰 · 谢霆锋 · 陶喆 · 张艺兴 · 五月天 · 周杰伦 · 薛之谦 · 汪苏泷',
  yearRange: '2024 — 2026'
}

/* ---------- 首页页面元数据 ---------- */
export const pageMeta = {
  home: ['PERSONAL ARCHIVE / 2026', '还记得你说家是唯一的城堡', '研究、作品与被音乐点亮的夜晚，构成一个仍在生长的个人档案。'],
  academics: ['ACADEMICS / 学业', '我一路向北', '绩点、标化与 AP 成绩，是努力留下的可读痕迹。'],
  honors: ['HONORS / 荣誉', '一步一步往上爬', '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。'],
  research: ['RESEARCH / 研究', '我不完美的梦，你陪着我想', '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。'],
  works: ['WORKS / 作品', '承认不勇敢，你能不能别离开', '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。'],
  concerts: ['CONCERTS / 演唱会', '缘分让我们相遇乱世以外', '十四场现场，十七张海报，记录那些被灯光和合唱重新定义的夜晚。']
}

export const heroGeo = {
  home: '39.9042° N / 116.4074° E',
  academics: '40.0369° N / 116.3087° E',
  honors: '40.0458° N / 116.3175° E',
  research: '39.9848° N / 116.3158° E',
  works: '39.9356° N / 116.4329° E',
  concerts: '39.9296° N / 116.3911° E'
}

/* ---------- 首页五个小世界入口数据 ---------- */
export const worlds = [
  { key: 'academics', no: '01', label: '学业', en: 'Academics', icon: '✦', href: 'academics.html', desc: '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', accent: 'aqua' },
  { key: 'honors', no: '02', label: '荣誉', en: 'Honors', icon: '❖', href: 'honors.html', desc: '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', accent: 'violet' },
  { key: 'research', no: '03', label: '研究', en: 'Research', icon: '◉', href: 'research.html', desc: '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', accent: 'gold' },
  { key: 'works', no: '04', label: '作品', en: 'Works', icon: '♬', href: 'works.html', desc: '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。', accent: 'aqua' },
  { key: 'concerts', no: '05', label: '演唱会', en: 'Concerts', icon: '♪', href: 'concerts.html', desc: '十四场现场，十七张海报，记录那些被灯光和合唱重新定义的夜晚。', accent: 'gold' }
]

/* ---------- "现在进行时" 数据 ---------- */
export const nowActive = {
  research: 'FishFreshNet V2 · FreshEye 网页工具',
  status: '研究中 · 持续迭代',
  location: '北京',
  lastUpdate: '2026.08'
}
