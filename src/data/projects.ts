import { statusLabels } from './site'
import type { Project } from './types'

export const projects = [
  {
    id: 'fresheye', status: 'deployed', statusLabel: statusLabels.deployed, updatedAt: '2026-08-08',
    title: '鲜眸', en: 'FreshEye', domain: 'fresheye.yance777.com', tone: 'aqua', icon: 'eye',
    description: '上传鱼眼照片，AI 评估水产品新鲜度，输出等级、置信度与 Grad-CAM 热力图。',
    value: '让水产品新鲜度评估从实验室走向日常使用。',
    role: '全栈开发 · 模型训练 · UI 设计',
    stack: ['PyTorch', 'ONNX', 'Vue 3', 'HuggingFace Spaces'],
    href: 'https://fresheye.yance777.com',
    github: 'https://github.com/yance77777/FreshEye',
    caseStudy: {
      visual: { src: 'assets/case/fresheye-og-cover.png', alt: 'FreshEye 官方产品封面图' },
      visuals: [
        { src: 'assets/case/fresheye-sample-fresh.webp', label: 'FRESH SAMPLE', alt: 'FreshEye 真实输入样本：新鲜鱼眼图像' },
        { src: 'assets/case/fresheye-sample-highly-fresh.webp', label: 'HIGHLY FRESH', alt: 'FreshEye 真实输入样本：高度新鲜鱼眼图像' },
        { src: 'assets/case/fresheye-sample-not-fresh.webp', label: 'NOT FRESH', alt: 'FreshEye 真实输入样本：不新鲜鱼眼图像' }
      ],
      preview: {
        eyebrow: 'INTERACTIVE PRODUCT PREVIEW · REPRESENTATIVE INTERFACE',
        status: 'MODEL READY',
        input: {
          navigation: ['NEW ANALYSIS', 'HISTORY', 'EXPORT PDF'],
          toolbar: 'UPLOAD IMAGE',
          format: 'JPEG · PNG',
          title: 'Drop image here',
          hint: 'or choose a fish-eye photo',
          resolution: '224 × 224',
          action: 'START ANALYSIS →'
        },
        result: {
          navigation: ['NEW ANALYSIS', 'RESULT', 'EXPORT PDF'],
          toolbar: 'ANALYSIS / 0024',
          status: 'COMPLETE',
          label: 'FRESHNESS',
          className: 'Fresh',
          confidenceLabel: 'Confidence score',
          confidence: '99.23%',
          dataset: 'MFED · 3 classes'
        },
        explain: {
          navigation: ['NEW ANALYSIS', 'RESULT', 'GRAD-CAM'],
          toolbar: 'EXPLAIN / GRAD-CAM',
          model: 'LIGHTCRA',
          evidenceLabel: 'MODEL EVIDENCE',
          method: 'Grad-CAM',
          label: 'ATTENTION REGION',
          description: '重点关注鱼眼虹膜纹理区域，为分类结果提供可读证据。',
          signals: [
            { label: 'IRIS TEXTURE', value: '0.94' },
            { label: 'COLOR SIGNAL', value: '0.71' }
          ]
        }
      },
      problem: '传统新鲜度评估依赖人工判断或实验室方法，难以在日常场景中快速复核。',
      research: {
        title: 'FishFreshNet V2',
        detail: '99.29% accuracy · 4.095M parameters',
        href: 'research.html#fishfreshnet-v2'
      },
      product: ['Upload', 'Inference', 'Confidence', 'Grad-CAM', 'PDF'],
      engineering: ['Vue 3', 'FastAPI', 'ONNX / PyTorch', 'Docker', 'Hugging Face Spaces'],
      proof: [
        { type: 'deployment', label: 'LIVE PRODUCT', value: 'fresheye.yance777.com', href: 'https://fresheye.yance777.com', external: true },
        { type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance77777/FreshEye', external: true }
      ]
    }
  },
  {
    id: 'encore', status: 'deployed', statusLabel: statusLabels.deployed, updatedAt: '2026-08-08',
    title: '余响', en: 'Encore', domain: 'encore.yance777.com', tone: 'gold', icon: 'note',
    description: '记录演唱会足迹，把每一站灯光与合唱收进属于音乐的屋子。',
    value: '把散落的演唱会记忆收进一个可以反复打开的档案。',
    role: '前端开发 · UI 设计 · 内容策划',
    stack: ['Vue 3', 'Vite', 'GitHub Pages'],
    previewImages: ['assets/concerts/concert-202510-zhang-yixing-01.jpg', 'assets/concerts/concert-202606-zhou-jielun.jpg'],
    href: 'https://encore.yance777.com',
    github: 'https://github.com/yance77777/encore'
  }
] satisfies Project[]

export const featuredProjects = projects.filter((item) => item.id === 'fresheye')

/* ---------- 演唱会记忆档案 ---------- */
