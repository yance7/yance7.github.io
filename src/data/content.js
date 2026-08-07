/* ==========================================================================
   静默工作室 · 内容数据（与简历 main.tex 一一对应）
   ========================================================================== */

export const navItems = [
  { key: 'home', label: '首页', en: 'Home', href: 'index.html', desc: '个人档案入口' },
  { key: 'academics', label: '学业', en: 'Academics', href: 'academics.html', desc: '绩点、标化与 AP 成绩' },
  { key: 'honors', label: '荣誉', en: 'Honors', href: 'honors.html', desc: '奖项与竞赛记录' },
  { key: 'research', label: '研究', en: 'Research', href: 'research.html', desc: '从论文到产品' },
  { key: 'works', label: '作品', en: 'Works', href: 'works.html', desc: '已上线的项目' },
  { key: 'concerts', label: '演唱会', en: 'Concerts', href: 'concerts.html', desc: '现场记忆档案' }
]

/* ---------- 标化成绩 ---------- */
export const stats = [
  { value: '4.0', label: 'GPA', note: '未加权满分绩点' },
  { value: '1490', label: 'SAT', note: '数学 800 · 语文 690' },
  { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
  { value: '7.5', label: 'IELTS', note: 'L8 · R9 · W7.5 · S6' }
]

/* ---------- 教育履历 ---------- */
export const education = [
  { period: '2024.02 — 至今', name: '北京市第八十中学国际部', en: 'International Dept, Beijing No.80 High School' },
  { period: '2021.09 — 2024.01', name: '北京陈经纶中学团结湖分校', en: 'Beijing Chen Jinglun MS Tuanjiehu Branch' },
  { period: '2015.09 — 2021.07', name: '朝阳实验小学', en: 'Chaoyang Experimental Primary School' }
]

/* ---------- AP 成绩档案（9 门已得 5 分 + 3 门待出分） ---------- */
export const apScores = [
  { name: '微积分 BC', en: 'Calculus BC', year: 'Grade 10', score: 5, status: 'done' },
  { name: '物理 1', en: 'Physics 1', year: 'Grade 10', score: 5, status: 'done' },
  { name: '计算机科学 A', en: 'Computer Science A', year: 'Grade 10', score: 5, status: 'done' },
  { name: '生物学', en: 'Biology', year: 'Grade 11', score: 5, status: 'done' },
  { name: '化学', en: 'Chemistry', year: 'Grade 11', score: 5, status: 'done' },
  { name: '统计学', en: 'Statistics', year: 'Grade 11', score: 5, status: 'done' },
  { name: '环境科学', en: 'Environmental Science', year: 'Grade 11', score: 5, status: 'done' },
  { name: '计算机科学原理', en: 'CS Principles', year: 'Grade 11', score: 5, status: 'done' },
  { name: '微观经济学', en: 'Microeconomics', year: 'Grade 11', score: 5, status: 'done' },
  { name: '物理 C 力学', en: 'Physics C: Mechanics', year: 'Grade 12', score: null, status: 'pending' },
  { name: '物理 C 电磁学', en: 'Physics C: E&M', year: 'Grade 12', score: null, status: 'pending' },
  { name: '宏观经济学', en: 'Macroeconomics', year: 'Grade 12', score: null, status: 'pending' }
]

/* ---------- 荣誉奖项（13 项，按时间倒序） ---------- */
export const honorCategories = [
  { key: 'all', label: '全部' },
  { key: 'peak', label: '领航级', en: 'PIONEER' },
  { key: 'excellent', label: '卓越级', en: 'DISTINGUISHED' },
  { key: 'emerging', label: '新锐级', en: 'MERIT' }
]

export const honorStats = [
  { value: '13', label: '项荣誉', note: '2025 — 2026' },
  { value: '4', label: '领航级', note: 'UKChO · BBO · USACO · TRAE' },
  { value: '2', label: '卓越级', note: 'USABO · 北京科创大赛' },
  { value: '7', label: '新锐级', note: '国际 · 国家 · 区域' }
]

export const honors = [
  {
    date: '2026.08', level: 'emerging', title: '第九届全国青少年人工智能创新挑战赛 · 三等奖',
    org: 'National Youth AI Innovation Challenge',
    detail: '国家级人工智能创新挑战赛，在算法设计与工程实现环节获得三等奖。'
  },
  {
    date: '2026.07', level: 'peak', title: 'TRAE AI 创意大赛 · Top 300',
    org: '约 14,000 参赛者',
    detail: '在约 14,000 名参赛者中进入前 300，提交了基于 AI 视觉的创意应用方案。'
  },
  {
    date: '2026.05', level: 'peak', title: '英国化学奥赛 UKChO · 全球金奖',
    org: 'UK Chemistry Olympiad',
    detail: 'UKChO 英国化学奥林匹克竞赛全球金奖，考察无机、有机、物理化学综合能力。'
  },
  {
    date: '2026.05', level: 'excellent', title: '美国生物奥赛 USABO · 全球银奖',
    org: 'USA Biology Olympiad',
    detail: 'USABO 美国生物奥林匹克竞赛全球银奖。'
  },
  {
    date: '2026.05', level: 'emerging', title: '加拿大化学竞赛 CCC · 全国铜奖',
    org: 'Canadian Chemistry Contest',
    detail: '加拿大化学竞赛（CCC）全国铜奖。'
  },
  {
    date: '2026.05', level: 'emerging', title: 'Senior Physics Challenge · 全球铜奖',
    org: 'UK Senior Physics Challenge',
    detail: '英国物理挑战赛全球铜奖。'
  },
  {
    date: '2026.03', level: 'peak', title: '英国生物奥赛 BBO · 全球金奖',
    org: 'British Biology Olympiad',
    detail: 'BBO 英国生物奥林匹克竞赛全球金奖。'
  },
  {
    date: '2026.03', level: 'emerging', title: 'iHOSA 全国轮 BCE · 全国优秀奖',
    org: 'iHOSA National Round',
    detail: 'iHOSA 全国轮 BCE（基础化学与生物）全国优秀奖。'
  },
  {
    date: '2026.03', level: 'excellent', title: '北京青少年科技创新大赛 · 二等奖',
    org: 'Beijing Adolescents S&T Innovation Contest',
    detail: '北京青少年科技创新大赛二等奖。'
  },
  {
    date: '2026.02', level: 'peak', title: 'USACO 2025-2026 赛季 · Gold Division',
    org: 'USA Computing Olympiad',
    detail: 'USACO 2025-2026 赛季金级别，算法与数据结构竞赛。'
  },
  {
    date: '2026.01', level: 'emerging', title: '北京朝阳青少年金鹏科技论坛 · 二等奖',
    org: 'Chaoyang Jinping Technology Forum',
    detail: '朝阳区金鹏科技论坛二等奖。'
  },
  {
    date: '2025.12', level: 'emerging', title: '北京朝阳青少年科技创新大赛 · 一等奖',
    org: 'Chaoyang Adolescents S&T Innovation Contest',
    detail: '朝阳区青少年科技创新大赛一等奖。'
  },
  {
    date: '2025.04', level: 'emerging', title: '加拿大化学竞赛 CCC · 区域优秀奖',
    org: 'Canadian Chemistry Contest',
    detail: '加拿大化学竞赛（CCC）区域优秀奖。'
  }
]

/* ---------- 研究项目（5 项，按时间倒序） ---------- */
export const research = [
  {
    date: '2026.04 — 至今',
    tag: 'WEB TOOL',
    status: 'active',
    title: 'FreshEye：AI 水产品新鲜度评估网页工具',
    org: '个人项目 · HuggingFace Spaces + GitHub Pages',
    text: '将 FishFreshNet 研究线转化为零安装网页工具，用户上传鱼眼照片即可获得新鲜度等级、置信度与 Grad-CAM 热力图。',
    link: 'https://github.com/yance77777/FreshEye',
    metrics: [
      { value: '零安装', label: '浏览器端' },
      { value: 'Grad-CAM', label: '可解释性' },
      { value: '4 标签', label: '报告导出' }
    ],
    methodology: {
      question: '如何让水产品新鲜度评估从实验室走向日常使用？',
      hypothesis: '轻量化 CNN 配合 Grad-CAM 可视化，能在浏览器端实现实时、可解释的新鲜度分级。',
      method: 'FishFreshNet V2 模型 + ONNX 推理 + Dockerized FastAPI 后端 + 响应式前端',
      prototype: 'Hugging Face Spaces 部署，零安装网页工具，深海蓝青色 UI，支持拖拽上传与一键 PDF 导出',
      result: '上线运行，推理延迟 < 200ms，全本地可搜索历史记录',
      next: '移动端适配 + 多品种鱼类支持'
    }
  },
  {
    date: '2026.04 — 2026.06',
    tag: 'DEEP LEARNING',
    status: 'published',
    title: 'FishFreshNet V2：轻量可解释鱼眼新鲜度评估',
    org: '个人研究 · FishFreshNet V2',
    text: '引入轻量环形区域注意力 LightCRA，配合 ECA 通道注意力，实现 99.29% 准确率，同时保持轻量化部署能力。',
    link: 'https://github.com/yance77777/FishFreshNetV2',
    metrics: [
      { value: '99.29%', label: '准确率' },
      { value: '4.095M', label: '参数量' },
      { value: '5.31ms', label: '推理延迟' },
      { value: 'V2-Lite 95.72%', label: '超轻量版' }
    ],
    methodology: {
      question: '如何在保持轻量化的同时提升鱼眼新鲜度分类的可解释性？',
      hypothesis: '环形区域注意力机制能捕捉鱼眼虹膜的径向退化特征，配合 ECA 通道注意力实现近零成本再校准。',
      method: 'LightCRA 模块（仅增 0.083M 参数）+ ECA 通道注意力 + 五种子平均 + 配对 t 检验 + 消融实验',
      prototype: 'PyTorch 实现，在 MFED 数据集上训练与验证',
      result: '99.29% 准确率（4.095M 参数，5.31ms/图）；V2-Lite 95.72% 准确率（0.929M 参数，0.061G FLOPs）',
      next: '部署为网页工具 FreshEye'
    }
  },
  {
    date: '2026.02 — 2026.04',
    tag: 'PUBLISHED · ICIPAI 2026',
    status: 'published',
    title: 'FishFreshNet V1：基于注意力机制的轻量可解释评估框架',
    org: '国际会议论文 · ICIPAI 2026',
    text: '构建多阶段鱼眼数据集 MFED，将 CBAM 集成到 EfficientNet-B0，配合 Grad-CAM 完成轻量化、可解释的新鲜度分级。',
    link: 'https://github.com/yance77777/FishFreshNetV1',
    paper: {
      href: 'https://ieeexplore.ieee.org/abstract/document/11605650',
      doi: '10.1109/ICIPAI70034.2026.11605650',
      tag: 'IEEE XPLORE'
    },
    citation: `@INPROCEEDINGS{11605650,
  author={Yan, Ce},
  booktitle={2026 3rd International Conference on Image Processing and Artificial Intelligence (ICIPAI)},
  title={FishFreshNetV1: A Lightweight and Explainable Framework Based on Attention Mechanism for Fish Freshness Assessment},
  year={2026},
  pages={379-383},
  doi={10.1109/ICIPAI70034.2026.11605650}
}`,
    metrics: [
      { value: '98.88%', label: '准确率' },
      { value: '4.22M', label: '参数量' },
      { value: '0.41G', label: 'FLOPs' },
      { value: '4800 张', label: 'MFED 数据集' }
    ],
    methodology: {
      question: '如何利用鱼眼图像实现自动化、可解释的水产品新鲜度分级？',
      hypothesis: 'CBAM 注意力机制能有效聚焦鱼眼虹膜纹理变化区域，配合 Grad-CAM 提供可解释性。',
      method: 'EfficientNet-B0 backbone + CBAM 注意力 + Grad-CAM 可视化；MFED 数据集（3 级 × 20 样本 × 5 角度 × 4 光照 = 4800 张）',
      prototype: '论文投稿 ICIPAI 2026（第三届图像处理与人工智能国际会议）',
      result: '论文被接收，98.88% 准确率，超越 VGG16 与 ResNet18，体积可移动端部署',
      next: '升级为 V2 版本，引入环形区域注意力 LightCRA'
    }
  },
  {
    date: '2025.07 — 2025.12',
    tag: 'MULTIMODAL',
    status: 'completed',
    title: '基于多模态特征融合与通道注意力的鱼类摄食强度评估',
    org: '国家数字渔业创新中心 · 英才计划',
    text: '融合水下音频梅尔语谱图与水面视觉帧，通过 CNN6-ResNet34 双分支与 SE-Block 通道注意力实现实时鱼类摄食强度分级。',
    link: '',
    metrics: [
      { value: '91.82%', label: '准确率' },
      { value: '7611', label: '多模态样本对' },
      { value: '+9.25%', label: '超音频单模态' },
      { value: '+3.78%', label: '超图像单模态' }
    ],
    methodology: {
      question: '如何利用多模态信息评估鱼类摄食强度，解决因投喂不精确导致的饲料浪费与水污染？',
      hypothesis: '音频特征与视觉特征的融合能比单一模态更准确地判断摄食强度。',
      method: 'CNN6-ResNet34 双分支架构 + SE-Block 通道注意力融合模块 + 7611 多模态样本对',
      prototype: '国家数字渔业创新中心实验验证',
      result: '91.82% 测试准确率，超越音频单模态 9.25%、图像单模态 3.78%',
      next: '扩展数据集并优化融合策略'
    }
  },
  {
    date: '2024.12 — 2025.04',
    tag: 'PUBLISHED · ICBB 2026',
    status: 'published',
    title: '不同外源增强剂对玉米生长的影响与机制研究',
    org: '国际会议论文 · ICBB 2026（第八届生物技术与生物医学国际会议）',
    text: '研究可降解生物刺激素（壳寡糖 COS 与 γ-PGA）能否与化肥协同提升玉米氮利用率，通过 16S rRNA 测序与随机森林回归量化根际微生物群落。',
    link: '',
    paper: {
      href: 'https://www.bio-conferences.org/articles/bioconf/abs/2026/30/bioconf_icbb2026_02029/bioconf_icbb2026_02029.html',
      doi: '10.1051/bioconf/202623702029',
      tag: 'OPEN ACCESS'
    },
    citation: `@article{bioconf202623702029,
  author={Yan, Ce},
  title={不同外源增强剂对玉米生长的影响与机制研究},
  journal={BIO Web of Conferences},
  volume={237},
  pages={02029},
  year={2026},
  doi={10.1051/bioconf/202623702029}
}`,
    metrics: [
      { value: '102.9%', label: '生物量增长' },
      { value: '1% COS', label: '最优处理' },
      { value: 'Bacillota', label: '关键菌门' },
      { value: '16S rRNA', label: '测序方法' }
    ],
    methodology: {
      question: '可降解生物刺激素能否与化肥协同提升玉米氮利用率（通常低于 40%）？',
      hypothesis: '壳寡糖与 γ-PGA 能协同改善玉米氮吸收，并通过根际微生物群落变化促进生长。',
      method: '量化生物量、养分积累、抗氧化酶与根际细菌群落；16S rRNA 测序 + 随机森林回归模型',
      prototype: 'ICBB 2026 论文发表',
      result: '1% COS 处理使生物量增长 102.9%，Bacillota 被识别为关键产量驱动菌门',
      next: '拓展至其他作物与田间试验'
    }
  }
]

export const researchMethods = [
  { label: 'PyTorch', en: 'Deep Learning', cat: 'DEEP LEARNING' },
  { label: 'EfficientNet', en: 'Backbone', cat: 'DEEP LEARNING' },
  { label: 'CBAM / LightCRA', en: 'Attention', cat: 'DEEP LEARNING' },
  { label: 'Grad-CAM', en: 'Interpretability', cat: 'EXPLAINABLE AI' },
  { label: 'ONNX', en: 'Deployment', cat: 'ENGINEERING' },
  { label: 'FastAPI', en: 'Backend', cat: 'ENGINEERING' },
  { label: 'HuggingFace', en: 'Hosting', cat: 'ENGINEERING' },
  { label: '16S rRNA', en: 'Microbiome', cat: 'SCIENCE' },
  { label: 'Random Forest', en: 'Regression', cat: 'SCIENCE' }
]

/* ---------- 领导力 ---------- */
export const leadership = [
  { role: '社长', org: 'iHOSA 科技创新社', period: '2025.09 — 2026.09', note: '' },
  { role: '副社长', org: '生物社', period: '2025.09 — 2026.09', note: '' },
  { role: '主席', org: '学生自主管理委员会', period: '2025.09 — 2026.09', note: '' },
  { role: '副主席', org: '学生自主管理委员会', period: '2024.09 — 2025.09', note: '' }
]

/* ---------- 活动经历 ---------- */
export const activities = [
  {
    title: '"保护地球，低碳生活" 志愿活动', period: '2024.03 — 2024.04',
    org: '北京志愿者联合会',
    detail: '累计 72 小时志愿服务，制作社交媒体视频推广有机果蔬与节能理念。'
  },
  {
    title: 'Pioneer 全球问题解决学院', period: '2024.09 — 2024.12',
    org: 'Pioneer Global · 课程：Analyzing AI',
    detail: '教授评分 A-。完成关于引导高中生用 AI 对抗学术不诚实的报告，探讨科技与社会核心议题。'
  },
  {
    title: 'Pioneer 研究院', period: '2025.06 — 2025.08',
    org: 'Pioneer Research Institute · 计算中的批判意识',
    detail: '研究标题：将价值敏感设计应用于农业无人机。教授评分 A+。构建农业无人机量化评估体系，结合 SUS 量表实现闭环。'
  },
  {
    title: '北京市第八十中学学术报告会（第六届 & 第七届）', period: '2025.12 & 2026.06',
    org: 'Beijing No.80 High School',
    detail: '连续两届汇报研究成果，从 CNN/ResNet 到注意力机制与多模态学习，展示 FishFreshNet V1 到 V2 的演进。'
  },
  {
    title: 'AP 微积分 BC 助教', period: '2025.11 — 2026.04',
    org: 'Teaching Assistant',
    detail: '辅导同学微分方程、泰勒级数等概念；编写 70 页 AP 微积分 BC 学习手册。'
  }
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
    github: 'https://github.com/yance77777/FreshEye'
  },
  {
    title: '余响', en: 'Encore', domain: 'encore.yance777.com', tone: 'gold', icon: 'note',
    description: '记录演唱会足迹，把每一站灯光与合唱收进属于音乐的屋子。',
    value: '把散落的演唱会记忆收进一个可以反复打开的档案。',
    role: '前端开发 · UI 设计 · 内容策划',
    stack: ['Vue 3', 'Vite', 'GitHub Pages'],
    href: 'https://encore.yance777.com',
    github: 'https://github.com/yance77777/encore'
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
  home: ['PERSONAL ARCHIVE / 2026', '还记得你说家是唯一的城堡', '研究、作品与被音乐点亮的夜晚，构成一个仍在生长的个人档案。', { artist: '周杰伦', song: '稻香', album: '魔杰座' }],
  academics: ['ACADEMICS / 学业', '明日从此的坐标', '绩点、标化与 AP 成绩，是努力留下的可读痕迹。', { artist: '林俊杰', song: '明日坐标', album: '明日坐标' }],
  honors: ['HONORS / 荣誉', '一步一步往上爬', '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。', { artist: '周杰伦', song: '蜗牛', album: 'Fantasy Plus' }],
  research: ['RESEARCH / 研究', '我不完美的梦，你陪着我想', '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。', { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' }],
  works: ['WORKS / 作品', '因为我已慢慢懂，努力就能成功', '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。', { artist: '汪苏泷', song: '慢慢懂', album: '慢慢懂' }],
  concerts: ['CONCERTS / 演唱会', '缘分让我们相遇乱世以外', '十四场现场，十七张海报，记录那些被灯光和合唱重新定义的夜晚。', { artist: '邓紫棋', song: '光年之外', album: '' }]
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
