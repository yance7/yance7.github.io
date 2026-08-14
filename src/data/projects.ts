import type { Project } from './types'

export const projects = [
  {
    id: 'fresheye', status: 'deployed', updatedAt: '2026-08-08',
    title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance777.com', tone: 'aqua',
    discipline: 'COMPUTER VISION / WEB PRODUCT',
    description: '上传鱼眼照片，AI 评估水产品新鲜度，输出等级、置信度与 Grad-CAM 热力图。',
    value: '让水产品新鲜度评估从实验室走向日常使用。',
    role: '全栈开发 · 模型训练 · UI 设计',
    stack: ['PyTorch', 'ONNX', 'Vue 3', 'HuggingFace Spaces'],
    href: 'https://fresheye.yance777.com',
    github: 'https://github.com/yance7/FreshEye',
    story: {
      label: 'FROM RESEARCH TO PRODUCT',
      note: '把一次模型实验，继续做成任何人都能直接打开的工具。',
      chapters: [
        {
          label: '01 / QUESTION',
          title: '让新鲜度判断走出实验室',
          detail: '传统评估依赖人工判断或实验室方法，日常场景需要更快、更容易复核的入口。'
        },
        {
          label: '02 / MODEL',
          title: 'FishFreshNet V2',
          detail: '99.29% accuracy · 4.095M parameters',
          href: 'research.html#fishfreshnet-v2'
        },
        {
          label: '03 / DELIVERY',
          title: '从推理结果到可解释报告',
          detail: '置信度、Grad-CAM 热力图与 PDF 报告，共同构成一次完整的判断流程。'
        }
      ],
      sequenceLabel: 'PRODUCT FLOW',
      sequence: ['Upload', 'Inference', 'Confidence', 'Grad-CAM', 'PDF'],
      proof: [
        { type: 'deployment', label: 'LIVE PRODUCT', value: 'fresheye.yance777.com', href: 'https://fresheye.yance777.com', external: true },
        { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true }
      ]
    }
  },
  {
    id: 'encore', status: 'deployed', updatedAt: '2026-08-08',
    title: '余响', en: 'Encore', domain: 'encore.yance777.com', tone: 'gold',
    discipline: 'LIVE MUSIC / PERSONAL ARCHIVE',
    description: '记录演唱会足迹，把每一站灯光与合唱收进属于音乐的屋子。',
    value: '把散落的演唱会记忆收进一个可以反复打开的档案。',
    role: '前端开发 · UI 设计 · 内容策划',
    stack: ['Vue 3', 'Vite', 'GitHub Pages'],
    href: 'https://encore.yance777.com',
    github: 'https://github.com/yance7/Encore',
    story: {
      label: 'FROM LIVE TO MEMORY',
      note: '演出会散场，档案让现场拥有可以返回的坐标。',
      chapters: [
        {
          label: '01 / CAPTURE',
          title: '把一晚的现场留下来',
          detail: '日期、场馆、巡演与海报，让记忆不只停留在相册的时间线上。'
        },
        {
          label: '02 / ARCHIVE',
          title: '按年份重新组织足迹',
          detail: '把分散的演唱会记录整理成清晰、可浏览、可持续生长的个人档案。'
        },
        {
          label: '03 / RETURN',
          title: '给每次重看一个入口',
          detail: '灯光、合唱与抵达过的城市，被收进一个可以反复打开的小世界。'
        }
      ],
      sequenceLabel: 'MEMORY LOOP',
      sequence: ['Live', 'Archive', 'Encore'],
      proof: [
        { type: 'deployment', label: 'LIVE PRODUCT', value: 'encore.yance777.com', href: 'https://encore.yance777.com', external: true },
        { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/Encore', external: true }
      ]
    }
  }
] satisfies Project[]

export const featuredProjects = projects.filter((item) => item.id === 'fresheye')

/* ---------- 演唱会记忆档案 ---------- */
