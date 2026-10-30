import type { Project } from './types.ts'

export const projects = [
  {
    id: 'fresheye', status: 'deployed', action: 'live', updatedAt: '2026-10-22',
    title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance.me', tone: 'aqua',
    discipline: 'COMPUTER VISION / WEB PRODUCT',
    description: '零安装鱼眼新鲜度辅助筛查工具，提供等级、置信度、Grad-CAM 热力图、含四个标签页的报告与 A4 PDF 导出，并支持本地可搜索历史记录。',
    value: '把鱼眼新鲜度辅助筛查整理成可访问、可复核的网络工具。',
    role: '全栈开发 · 模型训练 · UI 设计',
    stack: ['PyTorch', 'ONNX', 'Vue 3', 'Hugging Face Spaces'],
    href: 'https://fresheye.yance.me',
    github: 'https://github.com/yance7/FreshEye',
    story: {
      label: 'FROM RESEARCH TO PRODUCT',
      note: '把研究流程延伸为可直接访问的鱼眼新鲜度辅助筛查工具。',
      chapters: [
        {
          label: '01 / QUESTION',
          title: '让新鲜度判断走出实验室',
          detail: '建立一个零安装的网页入口，帮助用户查看鱼眼新鲜度筛查结果与解释信息。'
        },
        {
          label: '02 / MODEL',
          title: 'FishFreshNet V2',
          detail: '99.29% accuracy · 4.095M parameters · five MFED runs',
          href: '/research/#fishfreshnet-v2'
        },
        {
          label: '03 / DELIVERY',
          title: '从推理结果到可解释报告',
          detail: '置信度、Grad-CAM 热力图、含四个标签页的报告与 A4 PDF 导出，组成可复核的筛查流程。'
        }
      ],
      sequenceLabel: 'PRODUCT FLOW',
      sequence: ['Upload', 'Inference', 'Confidence', 'Grad-CAM', 'PDF'],
      proof: [
        { type: 'deployment', label: 'LIVE PRODUCT', value: 'fresheye.yance.me', href: 'https://fresheye.yance.me', external: true },
        { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true }
      ]
    }
  },
  {
    id: 'trusted-garden',
    status: 'deployed',
    action: 'live',
    updatedAt: '2026-10-30',
    title: 'Trusted Garden',
    en: 'Trusted Garden',
    domain: 'trusted-garden.yance.me',
    tone: 'violet',
    discipline: '3D WEB / INTERACTIVE SCENE',
    description: '使用 Three.js、TypeScript 与 Vite 构建的 3D 农场参考场景，可切换摄像机视角、查看天气状态并在场景中漫游。模型与纹理由同一站点提供，信息面板中的读数为模拟展示值。',
    value: '通过视角切换、天气状态与场景漫游，探索 3D 农场参考场景。',
    role: '个人项目 · 三维场景与网页交互',
    stack: ['Three.js', 'TypeScript', 'Vite', 'glTF'],
    href: 'https://trusted-garden.yance.me/',
    github: 'https://github.com/yance7/trusted-garden',
    story: {
      label: '3D 农场参考场景',
      note: '通过视角、天气状态和漫游探索数字农场场景。',
      chapters: [
        {
          label: '01 / SCENE',
          title: '搭建 3D 农场场景',
          detail: '使用 Three.js、TypeScript 与 Vite 构建参考场景，模型与纹理由同一站点交付。'
        },
        {
          label: '02 / INTERACTION',
          title: '切换视角与天气',
          detail: '切换摄像机视角、查看天气状态，也可以在场景中漫游。'
        },
        {
          label: '03 / READOUT',
          title: '查看模拟数值',
          detail: '信息面板中的控制台数值为模拟展示值。'
        }
      ],
      sequenceLabel: '场景探索',
      sequence: ['场景', '视角', '天气', '漫游'],
      proof: []
    }
  },
  {
    id: 'ap-microeconomics-notes',
    status: 'open-source',
    action: 'repository',
    updatedAt: '2026-08-11',
    title: 'AP Micro 讲义',
    en: 'AP Micro Notes',
    domain: 'github.com/yance7/ap-microeconomics-notes',
    tone: 'gold',
    discipline: 'ECONOMICS EDUCATION / OPEN KNOWLEDGE',
    description: '一套面向 AP Microeconomics 学习者的中文开源讲义，包含课程模块、经济学图表、选择题、FRQ 与逐题解析。',
    value: '把概念、图形与练习整理成可以连续学习、复习与核验的路径。',
    role: '内容编写 · 课程结构设计 · 图表与构建工具开发',
    stack: ['Markdown', 'Python', 'Matplotlib', 'Pandoc'],
    href: 'https://github.com/yance7/ap-microeconomics-notes',
    story: {
      label: 'FROM COURSEWORK TO OPEN NOTES',
      note: '把分散的概念、图形和题目整理成一套可维护、可复习的开放学习档案。',
      chapters: [
        {
          label: '01 / CURRICULUM',
          title: '八个连续学习模块',
          detail: '从课程与考试概览，到市场、企业行为、要素市场、市场失灵以及答案解析。'
        },
        {
          label: '02 / VISUALIZATION',
          title: '39 张经济学图表',
          detail: '使用可维护脚本生成供需、成本、市场结构与政策分析图形。'
        },
        {
          label: '03 / PRACTICE',
          title: '60 道 MCQ、FRQ 与解析',
          detail: '练习题与答案按照相同单元和题号组织，便于复习后立即核验。'
        }
      ],
      sequenceLabel: 'LEARNING LOOP',
      sequence: ['Learn', 'Model', 'Practice', 'Review'],
      proof: [
        {
          type: 'source',
          label: 'SOURCE',
          value: 'GitHub',
          href: 'https://github.com/yance7/ap-microeconomics-notes',
          external: true
        }
      ]
    }
  }
] satisfies Project[]

/* ---------- 演唱会记忆档案 ---------- */
