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
    },
    'ap-microeconomics-notes': {
      ...base['ap-microeconomics-notes']!,
      title: 'AP Microeconomics 中文講義',
      value: '把概念、圖形與練習整理成可以連續學習、複習與核驗的路徑。',
      description: '一套面向 AP Microeconomics 學習者的中文開放講義，包含課程模組、經濟學圖表、選擇題、FRQ 與逐題解析。',
      role: '內容編寫 · 課程結構設計 · 圖表與建構工具開發',
      discipline: 'ECONOMICS EDUCATION / OPEN KNOWLEDGE',
      story: {
        label: 'FROM COURSEWORK TO OPEN NOTES',
        note: '把分散的概念、圖形和題目整理成一套可維護、可複習的開放學習檔案。',
        chapters: [
          { label: '01 / CURRICULUM', title: '八個連續學習模組', detail: '由課程與考試概覽，到市場、企業行為、要素市場、市場失靈以及答案解析。' },
          { label: '02 / VISUALIZATION', title: '39 張經濟學圖表', detail: '使用可維護腳本生成供求、成本、市場結構與政策分析圖形。' },
          { label: '03 / PRACTICE', title: '60 道 MCQ、FRQ 與解析', detail: '練習題與答案按照相同單元和題號組織，便於複習後立即核驗。' }
        ],
        sequenceLabel: 'LEARNING LOOP', sequence: ['Learn', 'Model', 'Practice', 'Review'],
        proof: [{ type: 'source', label: 'SOURCE', value: 'GitHub', href: 'https://github.com/yance7/ap-microeconomics-notes', external: true }]
      }
    }
  },
  section: { label: 'RELEASED WORLDS', title: '讓想法', accent: '可以被開啟', copySingular: '一個持續建構的小世界，記錄想法如何離開紙面，成為可以使用或繼續成長的成果。', copyPlural: '個持續建構的小世界，記錄想法如何離開紙面，成為可以使用或繼續成長的成果。' }
} satisfies ProjectLocaleCopy
