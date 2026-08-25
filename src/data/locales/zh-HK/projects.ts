import { projects } from '../../projects'
import type { ProjectLocaleCopy, ProjectCopy } from '../types'

const base = Object.fromEntries(projects.map((item) => [item.id, {
  title: item.title, value: item.value, description: item.description, role: item.role, discipline: item.discipline, story: item.story
}])) as Record<string, ProjectCopy>

export const projectsCopy = {
  entities: {
    ...base,
    fresheye: {
      ...base.fresheye!,
      title: '鮮眸',
      value: '讓魚類新鮮度評估由實驗室走進日常使用。',
      description: '上載魚眼相片，由 AI 評估魚類新鮮度，輸出等級、信心度及 Grad-CAM 熱力圖。',
      role: '全棧開發 · 模型訓練 · UI 設計',
      discipline: 'COMPUTER VISION / 網頁產品',
      story: {
        label: '由研究到產品',
        note: '把一次模型實驗，繼續做成任何人都能直接開啟的工具。',
        chapters: [
          { label: '01 / QUESTION', title: '讓新鮮度判斷走出實驗室', detail: '傳統評估依賴人工判斷或實驗室方法；日常場景需要更快、更容易覆核的入口。' },
          { label: '02 / MODEL', title: 'FishFreshNet V2', detail: '99.29% accuracy · 4.095M parameters', href: 'research.html#fishfreshnet-v2' },
          { label: '03 / DELIVERY', title: '由推理結果到可解釋報告', detail: '信心度、Grad-CAM 熱力圖及 PDF 報告，共同構成完整判斷流程。' }
        ],
        sequenceLabel: '產品流程', sequence: ['上載', '推理', '信心度', 'Grad-CAM', 'PDF'],
        proof: [{ type: 'deployment', label: '上線產品', value: 'fresheye.yance777.com', href: 'https://fresheye.yance777.com', external: true }, { type: 'source', label: '原始碼', value: 'GitHub', href: 'https://github.com/yance7/FreshEye', external: true }]
      }
    }
  },
  section: { label: 'RELEASED WORLDS', title: '讓想法', accent: '可以被開啟', copySingular: '一個已經上線的小世界，記錄想法如何離開紙面，開始被真實使用。', copyPlural: '個已經上線的小世界，記錄想法如何離開紙面，開始被真實使用。' }
} satisfies ProjectLocaleCopy
