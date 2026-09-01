import type { Project } from './types'

export const projects = [
  {
    id: 'fresheye', status: 'deployed', action: 'live', updatedAt: '2026-08-08',
    title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance777.com', tone: 'aqua',
    discipline: 'COMPUTER VISION / WEB PRODUCT',
    description: '上传鱼眼照片，AI 评估水产品新鲜度，输出等级、置信度与 Grad-CAM 热力图。',
    value: '让水产品新鲜度评估从实验室走向日常使用。',
    role: '全栈开发 · 模型训练 · UI 设计',
    stack: ['PyTorch', 'ONNX', 'Vue 3', 'Hugging Face Spaces'],
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
    id: 'ap-microeconomics-notes',
    status: 'open-source',
    action: 'repository',
    updatedAt: '2026-08-11',
    title: 'AP Microeconomics 中文讲义',
    en: 'AP Microeconomics Notes',
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
