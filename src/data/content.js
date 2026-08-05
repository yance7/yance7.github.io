export const navItems = [
  { key: 'home', label: '首页', en: 'Home', href: 'index.html' },
  { key: 'academics', label: '学业', en: 'Academics', href: 'academics.html' },
  { key: 'honors', label: '荣誉', en: 'Honors', href: 'honors.html' },
  { key: 'research', label: '研究', en: 'Research', href: 'research.html' },
  { key: 'works', label: '作品', en: 'Works', href: 'works.html' },
  { key: 'concerts', label: '演唱会', en: 'Concerts', href: 'concerts.html' }
]

export const stats = [
  { value: '4.0', label: 'GPA', note: '未加权满分绩点' },
  { value: '1490', label: 'SAT', note: '数学 800 · 语文 690' },
  { value: '9', label: 'AP 5分', note: '全部满分通过' },
  { value: '108', label: 'TOEFL', note: '学术英语能力' }
]

export const projects = [
  { title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance777.com', tone: 'aqua', icon: 'eye', description: '上传鱼眼照片，AI 评估水产品新鲜度，输出等级、置信度与 Grad-CAM 热力图。', href: 'https://fresheye.yance777.com' },
  { title: '余响', en: 'Encore', domain: 'encore.yance777.com', tone: 'gold', icon: 'note', description: '记录演唱会足迹，把每一站灯光与合唱收进属于音乐的屋子。', href: 'https://encore.yance777.com' }
]

export const research = [
  { date: '2026.04 — 至今', tag: 'WEB TOOL', title: '鲜眸 FreshEye：水产品新鲜度 AI 智能评估', org: '个人项目 · HuggingFace Spaces + GitHub Pages', text: '将 FishFreshNet 研究线转化为零安装网页工具，用户上传鱼眼照片即可获得新鲜度等级、置信度与 Grad-CAM 热力图。', link: 'https://fresheye.yance777.com' },
  { date: '2026.04 — 2026.06', tag: 'DEEP LEARNING', title: 'FishFreshNet V2：轻量化可解释水产品新鲜度评估', org: '个人项目 · FishFreshNet V2', text: '引入环形区域注意力 LightCRA 与 ECA，实现 99.29% 准确率，同时保持轻量化部署能力。', link: 'https://github.com/yance7/FishFreshNetV2' },
  { date: '2026.02 — 2026.04', tag: 'PUBLISHED · ICIPAI 2026', title: 'FishFreshNet V1：基于注意力机制的评估框架', org: '国际会议论文 · FishFreshNet V1', text: '构建多阶段鱼眼数据集 MFED，结合 CBAM 与 Grad-CAM 完成轻量化、可解释的新鲜度分级。', link: 'https://github.com/yance7/FishFreshNetV1' },
  { date: '2025.07 — 2025.12', tag: 'MULTIMODAL', title: '基于多模态特征融合的鱼类摄食强度评估', org: '个人研究 · 数字渔业', text: '融合音频与视觉信息，探索水下环境中鱼类行为识别与摄食强度评估。' }
]

export const honors = [
  { level: 'I', title: '国际金牌', en: 'PREMIER', color: 'gold', items: ['TRAE AI 创意大赛 · Top 300 / 约 14,000', '英国化学奥赛 · 全球金奖', '英国生物奥赛 · 全球金奖', '国际化学竞赛 · 金奖'] },
  { level: 'II', title: '卓越银章', en: 'DISTINGUISHED', color: 'aqua', items: ['全国中学生物理竞赛 · 省级一等奖', '全国中学生数学竞赛 · 省级一等奖', 'USACO · Gold Division', '国际计算机竞赛 · 银奖'] },
  { level: 'III', title: '稳步积累', en: 'MERIT', color: 'violet', items: ['科技创新项目 · 优秀奖', '校级学术研究奖', '综合素质发展奖', '社区科学传播志愿者'] }
]

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

export const apScores = [
  { name: '微积分 BC', en: 'Calculus BC', year: '2025' },
  { name: '物理 1', en: 'Physics 1', year: '2025' },
  { name: '计算机科学 A', en: 'Computer Science A', year: '2025' },
  { name: '生物学', en: 'Biology', year: '2026' },
  { name: '化学', en: 'Chemistry', year: '2026' },
  { name: '统计学', en: 'Statistics', year: '2026' },
  { name: '环境科学', en: 'Environmental Science', year: '2026' },
  { name: '心理学', en: 'Psychology', year: '2026' },
  { name: '宏观经济学', en: 'Macroeconomics', year: '2026' }
]

export const heroGeo = {
  home: '39.9042° N / 116.4074° E',
  academics: '40.0369° N / 116.3087° E',
  honors: '40.0458° N / 116.3175° E',
  research: '39.9848° N / 116.3158° E',
  works: '39.9356° N / 116.4329° E',
  concerts: '39.9296° N / 116.3911° E'
}
