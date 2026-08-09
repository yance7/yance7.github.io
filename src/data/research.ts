import type { FeaturedResearch, ResearchItem, ResearchMethod } from './types'

export const research = [
  {
    id: 'fresheye',
    date: '2026.04 — 至今',
    updatedAt: '2026-08-08',
    tag: 'WEB TOOL',
    status: 'active',
    title: 'FreshEye：AI 水产品新鲜度评估网页工具',
    org: '个人项目 · HuggingFace Spaces + GitHub Pages',
    text: '将 FishFreshNet 研究线转化为零安装网页工具，用户上传鱼眼照片即可获得新鲜度等级、置信度与 Grad-CAM 热力图。',
    link: 'https://github.com/yance7/FreshEye',
    proof: [
      { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true },
      { type: 'deployment', label: 'DEPLOYED AS', value: 'FreshEye', href: 'works.html#project-fresheye' }
    ],
    metrics: [
      { value: '零安装', label: '浏览器端' },
      { value: 'Grad-CAM', label: '可解释性' },
      { value: 'PDF', label: '报告导出' }
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
    id: 'fishfreshnet-v2',
    date: '2026.04 — 2026.06',
    updatedAt: '2026-06-30',
    tag: 'DEEP LEARNING',
    status: 'published',
    title: 'FishFreshNet V2：轻量可解释鱼眼新鲜度评估',
    org: '个人研究 · FishFreshNet V2',
    text: '引入轻量环形区域注意力 LightCRA，配合 ECA 通道注意力，实现 99.29% 准确率，同时保持轻量化部署能力。',
    link: 'https://github.com/yance7/FishFreshNetV2',
    proof: [
      { type: 'experiment', label: 'EXPERIMENT', value: 'Five seeds', href: 'https://github.com/yance7/FishFreshNetV2', external: true },
      { type: 'deployment', label: 'DEPLOYED AS', value: 'FreshEye', href: 'works.html#project-fresheye' }
    ],
    metrics: [
      { value: '99.29%', label: '准确率', note: '5-seed mean' },
      { value: '4.095M', label: '参数量', note: 'V2 model' },
      { value: '5.31ms', label: '推理延迟', note: 'device setup' },
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
    id: 'fishfreshnet-v1',
    date: '2026.02 — 2026.04',
    updatedAt: '2026-04-30',
    tag: 'PUBLISHED · ICIPAI 2026',
    status: 'published',
    title: 'FishFreshNet V1：基于注意力机制的轻量可解释评估框架',
    org: '国际会议论文 · ICIPAI 2026',
    text: '构建多阶段鱼眼数据集 MFED，将 CBAM 集成到 EfficientNet-B0，配合 Grad-CAM 完成轻量化、可解释的新鲜度分级。',
    link: 'https://github.com/yance7/FishFreshNetV1',
    proof: [
      { type: 'paper', label: 'PAPER', value: 'ICIPAI 2026', href: 'https://ieeexplore.ieee.org/abstract/document/11605650', external: true },
      { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FishFreshNetV1', external: true }
    ],
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
      { value: '99.23%', label: '准确率', note: 'MFED · paper result' },
      { value: '4.22M', label: '参数量' },
      { value: '0.41G', label: 'FLOPs' },
      { value: '4800 张', label: 'MFED 数据集' }
    ],
    methodology: {
      question: '如何利用鱼眼图像实现自动化、可解释的水产品新鲜度分级？',
      hypothesis: 'CBAM 注意力机制能有效聚焦鱼眼虹膜纹理变化区域，配合 Grad-CAM 提供可解释性。',
      method: 'EfficientNet-B0 backbone + CBAM 注意力 + Grad-CAM 可视化；MFED 数据集（3 级 × 20 样本 × 5 角度 × 4 光照 = 4800 张）',
      prototype: '论文投稿 ICIPAI 2026（第三届图像处理与人工智能国际会议）',
      result: '论文被接收，99.23% 准确率，超越 VGG16 与 ResNet18，体积可移动端部署',
      next: '升级为 V2 版本，引入环形区域注意力 LightCRA'
    }
  },
  {
    id: 'multimodal-feeding',
    date: '2025.07 — 2025.12',
    updatedAt: '2025-12-31',
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
    id: 'corn-growth',
    date: '2024.12 — 2025.04',
    updatedAt: '2026-08-08',
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
] satisfies ResearchItem[]

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
] satisfies ResearchMethod[]

function toFeaturedResearch(item: ResearchItem): FeaturedResearch {
  const metrics = item.metrics
  if (!metrics || metrics.length < 2) {
    throw new Error(`Featured research item ${item.id} needs two summary metrics`)
  }
  return {
    id: item.id,
    title: item.title,
    text: item.text,
    summaryMetrics: [metrics[0], metrics[1]]
  }
}

export const featuredResearch = research
  .filter((item) => item.id === 'fishfreshnet-v2')
  .map(toFeaturedResearch)

/* ---------- 领导力 ---------- */
