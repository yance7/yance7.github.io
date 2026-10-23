import type { ResearchItem, ResearchMethod, ResearchMethodGroup } from './types.ts'

export const research = [
  {
    id: 'fresheye',
    date: '2026.05 — 2026.09',
    updatedAt: '2026-10-22',
    tag: 'WEB TOOL',
    status: 'completed',
    title: 'FreshEye：AI 水产品新鲜度评估网页工具',
    org: '个人项目 · Hugging Face Spaces + GitHub Pages',
    text: '将 FishFreshNet V2 转化为零安装的新鲜度辅助筛查工具：上传鱼眼照片后可查看等级、置信度与 Grad-CAM 热力图，并生成四标签报告与 A4 PDF；工具提供本地可搜索历史记录。',
    link: 'https://github.com/yance7/FreshEye',
    proof: [
      { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true },
      { type: 'deployment', label: 'DEPLOYED AS', value: 'FreshEye', href: '/works/#project-fresheye' }
    ],
    metrics: [
      { value: '零安装', label: '浏览器端' },
      { value: 'Grad-CAM', label: '可解释性' },
      { value: 'PDF', label: '报告导出' }
    ],
    methodology: {
      question: '如何将鱼眼新鲜度评估整理成可访问、可复核的辅助筛查流程？',
      hypothesis: '将 FishFreshNet V2 的分类结果与 Grad-CAM 解释和报告导出组合，可帮助用户复核筛查结果。',
      method: 'FishFreshNet V2 + Dockerized FastAPI 后端（Hugging Face Spaces）+ GitHub Pages 响应式前端',
      prototype: '零安装网页工具：上传鱼眼照片，查看新鲜度等级、置信度与 Grad-CAM 热力图，并导出四标签 A4 PDF 报告。',
      result: '提供可搜索的本地历史记录；该工具用于新鲜度辅助筛查，不替代实验室检验。',
      next: '继续扩展实际场景验证。'
    }
  },
  {
    id: 'fishfreshnet-v2',
    date: '2026.04 — 2026.06',
    updatedAt: '2026-10-22',
    tag: 'DEEP LEARNING',
    status: 'completed',
    title: 'FishFreshNet V2：轻量可解释鱼眼新鲜度评估',
    org: '个人研究 · FishFreshNet V2',
    text: '面向取景一致的鱼眼裁剪，采用 LightCRA 固定同心环掩码与可学习环权重，并结合 ECA 通道注意力；五次 MFED 运行的准确率为 99.29%。',
    link: 'https://github.com/yance7/FishFreshNetV2',
    proof: [
      { type: 'experiment', label: 'EXPERIMENT', value: 'Five seeds', href: 'https://github.com/yance7/FishFreshNetV2', external: true },
      { type: 'deployment', label: 'DEPLOYED AS', value: 'FreshEye', href: '/works/#project-fresheye' }
    ],
    metrics: [
      { value: '99.29%', label: '准确率', note: '5 次 MFED 运行' },
      { value: '4.095M', label: '参数量', note: 'V2 model' },
      { value: '96.83%', label: 'V2-Lite 准确率' },
      { value: '65.5–78.2%', label: '前向延迟降低', note: '7 种边缘设备 · Lite 对比对应 V2' }
    ],
    methodology: {
      question: '如何为取景一致的鱼眼图像建立轻量、可解释的新鲜度分类方法？',
      hypothesis: '固定同心环掩码和可学习环权重可组织鱼眼区域特征，并与 ECA 通道注意力结合。',
      method: 'LightCRA 固定同心环掩码 + 可学习环权重 + ECA；五次 MFED 运行。适用范围为取景一致的鱼眼裁剪。',
      prototype: '以 PyTorch 实现，在 MFED 数据集上训练与评估；并在七种边缘设备上比较 V2 与 V2-Lite 前向延迟。',
      result: '五次 MFED 运行中，V2 准确率 99.29%、参数量 4.095M；V2-Lite 准确率 96.83%、参数量 0.966M、FLOPs 0.061G。七种边缘设备上，V2-Lite 相比对应 V2 的前向延迟降低 65.5%–78.2%。',
      next: '继续扩展 FreshEye 的实际场景验证。'
    }
  },
  {
    id: 'fishfreshnet-v1',
    date: '2026.02 — 2026.04',
    updatedAt: '2026-10-22',
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
      method: 'EfficientNet-B0 backbone + CBAM 注意力 + Grad-CAM 可视化；MFED 含 4,800 张图像，涵盖两种淡水鱼、三个新鲜度等级、六天采集、五个取景角度及四类光照与背景条件。',
      prototype: '发表于 ICIPAI 2026（第三届图像处理与人工智能国际会议），论文页码 379–383。',
      result: '原始评估结果为 99.23% 准确率、4.22M 参数量与 0.41G FLOPs。',
      next: '升级为 V2 版本，引入环形区域注意力 LightCRA'
    }
  },
  {
    id: 'multimodal-feeding',
    date: '2025.07 — 2025.12',
    updatedAt: '2026-10-22',
    tag: 'MULTIMODAL',
    status: 'completed',
    title: '基于多模态特征融合与通道注意力的鱼类摄食强度评估',
    org: '国家数字渔业创新中心 · 英才计划',
    text: '基于 MRS-FFIA 的 7,611 对音频与图像样本，融合 Mel 语谱图和图像，以 CNN6 / ResNet34 双分支与 SE-Block 分类鱼类摄食强度。',
    link: '',
    metrics: [
      { value: '91.82%', label: '准确率' },
      { value: '7611', label: '多模态样本对' },
      { value: '+9.25 个百分点', label: '相比音频单模态' },
      { value: '+3.78 个百分点', label: '相比图像单模态' }
    ],
    methodology: {
      question: '如何利用多模态信息评估鱼类摄食强度，解决因投喂不精确导致的饲料浪费与水污染？',
      hypothesis: '音频特征与视觉特征的融合能比单一模态更准确地判断摄食强度。',
      method: 'MRS-FFIA 的 7,611 对音频与图像样本；Mel 语谱图 + 图像，CNN6 / ResNet34 双分支 + SE-Block，分类为 none、weak、moderate、strong。',
      prototype: '国家数字渔业创新中心与国家英才计划项目中的研究。',
      result: '测试准确率 91.82%；比音频单模态高 9.25 个百分点，比图像单模态高 3.78 个百分点。',
      next: '扩展数据集并优化融合策略'
    }
  },
  {
    id: 'corn-growth',
    date: '2024.12 — 2025.04',
    updatedAt: '2026-10-22',
    tag: 'PUBLISHED · ICBB 2026',
    status: 'published',
    title: '不同外源增强剂对玉米生长的影响与机制研究',
    org: '国际会议论文 · ICBB 2026（第八届生物技术与生物医学国际会议）',
    text: '通过四种盆栽处理研究外源增强剂与玉米生长的关系，并使用 16S rRNA 测序和随机森林分析根际微生物数据。',
    link: '',
    paper: {
      href: 'https://www.bio-conferences.org/articles/bioconf/abs/2026/30/bioconf_icbb2026_02029/bioconf_icbb2026_02029.html',
      doi: '10.1051/bioconf/202623702029',
      tag: 'OPEN ACCESS'
    },
    citation: `@article{bioconf202623702029,
author={Yan, Ce},
title={The Effects of Different Exogenous Enhancers on Maize Growth and Their Mechanisms},
journal={BIO Web of Conferences},
volume={237},
pages={02029},
year={2026},
doi={10.1051/bioconf/202623702029}
}`,
    metrics: [
      { value: '102.9%', label: '相较化肥对照', note: '1% COS 生物量增加' },
      { value: '1% COS', label: '最优处理' },
      { value: 'Bacillota', label: '随机森林预测特征' },
      { value: '16S rRNA', label: '测序方法' }
    ],
    methodology: {
      question: '不同外源增强剂处理与玉米生长表现有何关系？',
      hypothesis: '化肥单独处理与外源增强剂组合可用于比较盆栽玉米的生长表现。',
      method: '四种盆栽处理：化肥对照、0.5% COS、1% COS、0.5% γ-PGA；量化生物量、养分积累、抗氧化酶与根际细菌群落，并使用 16S rRNA 测序和随机森林。',
      prototype: 'ICBB 2026 论文发表',
      result: '相较化肥单独处理，1% COS 处理的生物量增加 102.9%。Bacillota 是随机森林分析中的微生物预测特征，不据此推断因果。',
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
  { label: 'Hugging Face', en: 'Hosting', cat: 'ENGINEERING' },
  { label: '16S rRNA', en: 'Microbiome', cat: 'SCIENCE' },
  { label: 'Random Forest', en: 'Regression', cat: 'SCIENCE' }
] satisfies ResearchMethod[]

export const researchMethodGroups = [
  {
    id: 'modeling',
    label: '模型与解释',
    en: 'MODEL / EXPLAIN',
    description: '用轻量模型把研究问题变成可验证、可解释的判断。',
    items: researchMethods.filter((method) => method.cat === 'DEEP LEARNING' || method.cat === 'EXPLAINABLE AI')
  },
  {
    id: 'delivery',
    label: '工程与交付',
    en: 'SHIP / OPERATE',
    description: '把实验结果包装成可以部署、访问和持续迭代的产品。',
    items: researchMethods.filter((method) => method.cat === 'ENGINEERING')
  },
  {
    id: 'evidence',
    label: '实验与证据',
    en: 'MEASURE / PROVE',
    description: '用数据集、统计检验和可重复实验支撑每一个结论。',
    items: researchMethods.filter((method) => method.cat === 'SCIENCE')
  }
] satisfies ResearchMethodGroup[]

/* ---------- 领导力 ---------- */
