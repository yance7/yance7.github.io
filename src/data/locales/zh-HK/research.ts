import { research } from '../../research.ts'
import type { ResearchLocaleCopy, ResearchCopy } from '../types.ts'

const base = Object.fromEntries(research.map((item) => [item.id, {
  title: item.title, text: item.text, tag: item.tag, org: item.org, metrics: item.metrics, methodology: item.methodology, proof: item.proof
}])) as Record<string, ResearchCopy>

const zhHKMethods = [
  { label: 'PyTorch', en: '深度學習', cat: 'DEEP LEARNING' }, { label: 'EfficientNet', en: '骨幹網絡', cat: 'DEEP LEARNING' }, { label: 'CBAM / LightCRA', en: '注意力', cat: 'DEEP LEARNING' }, { label: 'Grad-CAM', en: '可解釋性', cat: 'EXPLAINABLE AI' }, { label: 'ONNX', en: '部署', cat: 'ENGINEERING' }, { label: 'FastAPI', en: '後端', cat: 'ENGINEERING' }, { label: 'Hugging Face', en: '託管', cat: 'ENGINEERING' }, { label: '16S rRNA', en: '微生物組', cat: 'SCIENCE' }, { label: 'Random Forest', en: '回歸', cat: 'SCIENCE' }
]

export const researchCopy = {
  entities: {
    ...base,
    fresheye: {
      ...base.fresheye!, title: 'FreshEye：魚類新鮮度評估網頁工具',
      text: '我把 FishFreshNet V2 轉化為毋須安裝的新鮮度輔助篩查工具：上載魚眼相片後可查看等級、信心度及 Grad-CAM 熱力圖，並匯出含四個分頁的 A4 PDF 報告；工具亦提供本地可搜尋歷史記錄。',
      org: '個人項目 · Hugging Face Spaces + GitHub Pages',
      metrics: [{ value: '毋須安裝', label: '瀏覽器端' }, { value: 'Grad-CAM', label: '可解釋性' }, { value: 'PDF', label: '報告匯出' }],
      methodology: { question: '如何把魚眼新鮮度評估整理成易於存取及覆核的輔助篩查流程？', hypothesis: '結合 FishFreshNet V2 分類、Grad-CAM 解釋及報告匯出，可協助使用者覆核篩查結果。', method: 'FishFreshNet V2 + Dockerized FastAPI 後端（Hugging Face Spaces）+ GitHub Pages 響應式前端', prototype: '毋須安裝的網頁工具：上載魚眼相片，查看等級、信心度及 Grad-CAM 熱力圖，並匯出含四個分頁的 A4 PDF 報告。', result: '提供可搜尋的本地歷史記錄，作新鮮度輔助篩查之用，不取代實驗室檢驗。', next: '繼續擴展實際場景驗證。' }
    },
    'fishfreshnet-v2': {
      ...base['fishfreshnet-v2']!, title: 'FishFreshNet V2：以環形區域注意力進行魚眼新鮮度分類的輕量可解釋框架',
      text: '針對取景一致的魚眼裁剪，我結合 LightCRA 固定同心環遮罩與可學習環權重，以及 ECA 通道注意力；五次 MFED 運行的準確率為 99.29%。',
      org: '個人研究 · FishFreshNet V2',
      metrics: [{ value: '99.29%', label: '準確率', note: '5 次 MFED 運行' }, { value: '4.095M', label: '參數量', note: 'V2 model' }, { value: '96.83%', label: 'V2-Lite 準確率' }, { value: '65.5–78.2%', label: '前向延遲降低', note: '7 種邊緣設備 · Lite 對比對應 V2' }],
      methodology: { question: '如何以取景一致的魚眼影像進行輕量、可解釋的新鮮度分類？', hypothesis: '固定同心環遮罩與可學習環權重可整理魚眼區域特徵，並與 ECA 通道注意力結合。', method: 'LightCRA 固定同心環遮罩 + 可學習環權重 + ECA；五次 MFED 運行。適用範圍為取景一致的魚眼裁剪。', prototype: '以 PyTorch 實作並於 MFED 評估；在七種邊緣設備上比較 V2 與 V2-Lite 的前向延遲。', result: '五次 MFED 運行中，V2 準確率 99.29%、參數量 4.095M；V2-Lite 準確率 96.83%、參數量 0.966M、FLOPs 0.061G。七種邊緣設備上，V2-Lite 相比對應 V2 的前向延遲降低 65.5%–78.2%。', next: '繼續擴展 FreshEye 的實際場景驗證。' }
    },
    'fishfreshnet-v1': {
      ...base['fishfreshnet-v1']!, title: 'FishFreshNet V1：基於注意力機制的輕量可解釋評估框架',
      text: '我建立 MFED 多階段魚眼數據集，共 4,800 張圖像，涵蓋兩種淡水魚、三個新鮮度等級、六天採集、五個取景角度及四類光照與背景條件；並將 CBAM 整合至 EfficientNet-B0，配合 Grad-CAM。',
      org: '國際會議論文 · ICIPAI 2026',
      metrics: [{ value: '99.23%', label: '準確率', note: 'MFED · paper result' }, { value: '4.22M', label: '參數量' }, { value: '0.41G', label: 'FLOPs' }, { value: '4,800 張', label: 'MFED 數據集' }],
      methodology: { question: '如何利用魚眼圖像進行自動、可解釋的新鮮度分級？', hypothesis: 'CBAM 可聚焦魚眼虹膜紋理變化區域，Grad-CAM 則提供可檢視的解釋。', method: 'EfficientNet-B0 backbone + CBAM 注意力 + Grad-CAM；MFED 共 4,800 張圖像，涵蓋兩種淡水魚、三個新鮮度等級、六天採集、五個取景角度及四類光照與背景條件。', prototype: '已發表於 ICIPAI 2026（第三屆圖像處理與人工智能國際會議），第 379–383 頁。', result: '原始評估結果為 99.23% 準確率、4.22M 參數量及 0.41G FLOPs。', next: '升級至加入 LightCRA 的 V2 版本' }
    },
    'multimodal-feeding': {
      ...base['multimodal-feeding']!, title: '基於多模態特徵融合與通道注意力的魚類攝食強度評估',
      text: '我融合音訊 Mel 語譜圖與影像，透過 CNN6 / ResNet34 雙分支及 SE-Block 通道注意力分類魚類攝食強度。',
      org: '國家數字漁業創新中心 · 國家英才計劃項目',
      metrics: [{ value: '91.82%', label: '準確率' }, { value: '7,611', label: 'MRS-FFIA 樣本對' }, { value: '+9.25 個百分點', label: '高於音訊單模態' }, { value: '+3.78 個百分點', label: '高於圖像單模態' }],
      methodology: { question: '如何利用多模態資訊評估魚類攝食強度？', hypothesis: '融合音訊及影像特徵可用於分類魚類攝食強度。', method: 'MRS-FFIA 的 7,611 對音訊與影像樣本；Mel 語譜圖 + 影像，CNN6 / ResNet34 雙分支 + SE-Block，分類為 none、weak、moderate、strong。', prototype: '國家數字漁業創新中心及國家英才計劃項目中的研究。', result: '測試準確率 91.82%；比音訊單模態高 9.25 個百分點，比圖像單模態高 3.78 個百分點。', next: '擴充數據集並優化融合策略' }
    },
    'corn-growth': {
      ...base['corn-growth']!, title: '不同外源增強劑對玉米生長的影響及其作用機制',
      text: '我比較四種盆栽處理——單獨施肥對照、0.5% COS、1% COS 及 0.5% γ-PGA，並以 16S rRNA 測序和隨機森林分析根際微生物數據。',
      org: '國際會議論文 · ICBB 2026',
      metrics: [{ value: '102.9%', label: '相較單獨施肥對照', note: '1% COS 生物量增加' }, { value: '1% COS', label: '處理' }, { value: 'Bacillota', label: '隨機森林預測特徵' }, { value: '16S rRNA', label: '測序方法' }],
      methodology: { question: '不同外源增強劑處理與玉米生長表現有何關係？', hypothesis: '單獨施肥及配合外源增強劑的盆栽處理可供比較玉米生長表現。', method: '四種盆栽處理：單獨施肥對照、0.5% COS、1% COS、0.5% γ-PGA；量化生物量、養分累積、抗氧化酶及根際細菌群落，並使用 16S rRNA 測序和隨機森林。', prototype: '以 ICBB 2026 論文形式發表。', result: '相較單獨施肥對照，1% COS 處理的生物量增加 102.9%。Bacillota 是隨機森林分析中的微生物預測特徵；此關聯不證明因果。', next: '拓展至其他作物及田間試驗' }
    }
  },
  methods: zhHKMethods,
  groups: [
    { id: 'modeling', label: '模型與解釋', en: 'MODEL / EXPLAIN', description: '用輕量模型把研究問題轉化為可驗證、可解釋的判斷。', items: [] as Array<{ label: string; en: string; cat: string }> },
    { id: 'delivery', label: '工程與交付', en: 'SHIP / OPERATE', description: '把實驗結果整理成可以部署、存取及持續迭代的產品。', items: [] as Array<{ label: string; en: string; cat: string }> },
    { id: 'evidence', label: '實驗與證據', en: 'MEASURE / PROVE', description: '以數據集、統計檢驗及可重複實驗支撐每一項結論。', items: [] as Array<{ label: string; en: string; cat: string }> }
  ],
  sections: {
    timeline: { label: 'RESEARCH', title: '研究', accent: '時間軸', copy: '5 個研究項目，按時間倒序呈現結果、論文、程式碼與產品證據。點擊展開方法論，可以繼續閱讀完整的思考路徑。' },
    toolchain: { label: 'METHODS / WORKBENCH', title: '方法與', accent: '技術棧', copy: '我把研究拆成一條可重用的工作鏈：先定義問題，再用模型驗證，最後把結果交付為可以開啟的工具。', workbench: 'THE WORKBENCH', workbenchTitle: '由問題到可用結果', workbenchCopy: '模型、工程與實驗不是三張清單，而是一條會反覆回到問題本身的工作鏈。', flowLabel: '研究工作鏈', flow: ['問題', '模型', '交付'], footer: ['研究循環進行中', '問題 → 證據 → 產品'] }
  }
} satisfies ResearchLocaleCopy

researchCopy.groups[0]!.items = researchCopy.methods.filter((method) => method.cat === 'DEEP LEARNING' || method.cat === 'EXPLAINABLE AI')
researchCopy.groups[1]!.items = researchCopy.methods.filter((method) => method.cat === 'ENGINEERING')
researchCopy.groups[2]!.items = researchCopy.methods.filter((method) => method.cat === 'SCIENCE')
