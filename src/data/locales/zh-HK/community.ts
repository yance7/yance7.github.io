import type { CommunityLocaleCopy } from '../types'

export const communityCopy = {
  leadership: [
    { role: '社長', org: 'iHOSA 科技創新社', period: '2025.09 — 2026.09', note: '' },
    { role: '副社長', org: '生物社', period: '2025.09 — 2026.09', note: '' },
    { role: '主席', org: '學生自主管理委員會', period: '2025.09 — 2026.09', note: '' },
    { role: '副主席', org: '學生自主管理委員會', period: '2024.09 — 2025.09', note: '' }
  ],
  activities: [
    { id: 'low-carbon-volunteer', featured: true, title: '「保護地球，低碳生活」義工活動', period: '2024.03 — 2024.04', org: '北京志願者聯合會', detail: '累計 72 小時義工服務，製作社交媒體影片推廣有機果蔬與節能理念。' },
    { id: 'pioneer-analyzing-ai', featured: false, title: 'Pioneer 全球問題解決學院', period: '2024.09 — 2024.12', org: 'Pioneer Global · 課程：Analyzing AI', detail: '教授評分 A-。完成關於引導高中生以 AI 對抗學術不誠實的報告，探討科技與社會核心議題。' },
    { id: 'pioneer-research-institute', featured: true, title: 'Pioneer 研究院', period: '2025.06 — 2025.08', org: 'Pioneer Research Institute · 計算中的批判意識', detail: '研究題目：將價值敏感設計應用於農業無人機。教授評分 A+，建立農業無人機量化評估體系，結合 SUS 量表實現閉環。' },
    { id: 'academic-report-forum', featured: false, title: '北京市第八十中學學術報告會（第六屆及第七屆）', period: '2025.12 & 2026.06', org: 'Beijing No.80 High School', detail: '連續兩屆匯報研究成果，展示 FishFreshNet V1 到 V2 由 CNN/ResNet 走向注意力機制與多模態學習的演進。' },
    { id: 'ap-calculus-assistant', featured: true, title: 'AP 微積分 BC 助教', period: '2025.11 — 2026.04', org: 'Teaching Assistant', detail: '輔導同學學習微分方程、Taylor 級數等概念；編寫 70 頁 AP 微積分 BC 學習手冊。' }
  ]
} satisfies CommunityLocaleCopy
