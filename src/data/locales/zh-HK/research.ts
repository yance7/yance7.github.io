import { research } from '../../research'
import type { ResearchLocaleCopy, ResearchCopy } from '../types'

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
      text: '我把 FishFreshNet 研究線轉化為毋須安裝的網頁工具。上載魚眼相片，即可取得新鮮度等級、信心度及 Grad-CAM 熱力圖。',
      org: '個人項目 · Hugging Face Spaces + GitHub Pages',
      metrics: [{ value: '毋須安裝', label: '瀏覽器端' }, { value: 'Grad-CAM', label: '可解釋性' }, { value: 'PDF', label: '報告匯出' }],
      methodology: { question: '如何讓魚類新鮮度評估由實驗室走進日常使用？', hypothesis: '輕量 CNN 配合 Grad-CAM，可在瀏覽器端提供即時且可解釋的新鮮度分級。', method: 'FishFreshNet V2 + ONNX 推理 + Dockerized FastAPI 後端 + 響應式前端', prototype: '部署於 Hugging Face Spaces，支援拖放上載及一鍵匯出 PDF。', result: '已上線，推理延遲 < 200ms，並支援完全本地化的歷史記錄搜尋。', next: '流動裝置支援 + 更多魚類品種' }
    },
    'fishfreshnet-v2': {
      ...base['fishfreshnet-v2']!, title: 'FishFreshNet V2：輕量且可解釋的魚眼新鮮度評估',
      text: '我引入輕量環形區域注意力 LightCRA 及 ECA 通道注意力，在維持輕量部署能力的同時取得 99.29% 準確率。',
      org: '個人研究 · FishFreshNet V2',
      metrics: [{ value: '99.29%', label: '準確率', note: '5-seed mean' }, { value: '4.095M', label: '參數量', note: 'V2 model' }, { value: '5.31ms', label: '推理延遲', note: 'device setup' }, { value: 'V2-Lite 95.72%', label: '超輕量版本' }],
      methodology: { question: '如何在保持輕量的同時提升魚眼分類的可解釋性？', hypothesis: '環形區域注意力能捕捉魚眼虹膜的徑向退化特徵，ECA 則提供低成本通道再校準。', method: 'LightCRA（僅增加 0.083M 參數）+ ECA 通道注意力 + 五種子平均 + 配對 t 檢驗 + 消融實驗', prototype: '以 PyTorch 實作，於 MFED 數據集上訓練及驗證。', result: '99.29% 準確率（4.095M 參數、5.31ms/圖）；V2-Lite 準確率 95.72%。', next: '部署為 FreshEye 網頁工具' }
    },
    'fishfreshnet-v1': {
      ...base['fishfreshnet-v1']!, title: 'FishFreshNet V1：基於注意力機制的輕量可解釋評估框架',
      text: '我建立多階段魚眼數據集 MFED，把 CBAM 整合至 EfficientNet-B0，並配合 Grad-CAM 完成輕量且可解釋的新鮮度分級。',
      org: '國際會議論文 · ICIPAI 2026',
      metrics: [{ value: '99.23%', label: '準確率', note: 'MFED · paper result' }, { value: '4.22M', label: '參數量' }, { value: '0.41G', label: 'FLOPs' }, { value: '4,800 張', label: 'MFED 數據集' }],
      methodology: { question: '如何利用魚眼圖像實現自動化及可解釋的新鮮度分級？', hypothesis: 'CBAM 能有效聚焦魚眼虹膜紋理變化區域，Grad-CAM 則提供可解釋性。', method: 'EfficientNet-B0 backbone + CBAM 注意力 + Grad-CAM；MFED 數據集共 4,800 張圖像', prototype: '論文獲 ICIPAI 2026（第三屆圖像處理與人工智能國際會議）接收。', result: '取得 99.23% 準確率，超越 VGG16 及 ResNet18，並適合流動裝置部署。', next: '升級至加入 LightCRA 的 V2 版本' }
    },
    'multimodal-feeding': {
      ...base['multimodal-feeding']!, title: '基於多模態特徵融合與通道注意力的魚類攝食強度評估',
      text: '我融合水下音訊梅爾頻譜圖與水面視覺影像，透過 CNN6-ResNet34 雙分支及 SE-Block 通道注意力，實現即時魚類攝食強度分級。',
      org: '國家數字漁業創新中心 · 英才計劃',
      metrics: [{ value: '91.82%', label: '準確率' }, { value: '7,611', label: '多模態樣本對' }, { value: '+9.25%', label: '高於單一音訊' }, { value: '+3.78%', label: '高於單一圖像' }],
      methodology: { question: '如何利用多模態資訊評估魚類攝食強度，減少餵飼不精確造成的飼料浪費與水污染？', hypothesis: '融合音訊及視覺特徵，比單一模態更能準確判斷攝食強度。', method: 'CNN6-ResNet34 雙分支 + SE-Block 通道注意力融合模組 + 7,611 對多模態樣本', prototype: '於國家數字漁業創新中心進行實驗驗證。', result: '測試準確率 91.82%，較單一音訊高 9.25%，較單一圖像高 3.78%。', next: '擴充數據集並優化融合策略' }
    },
    'corn-growth': {
      ...base['corn-growth']!, title: '不同外源增強劑對玉米生長的影響與機制研究',
      text: '我研究可降解生物刺激素（COS 及 γ-PGA）能否與化肥協同提升玉米氮利用率，並以 16S rRNA 測序及隨機森林回歸量化根際微生物群落。',
      org: '國際會議論文 · ICBB 2026',
      metrics: [{ value: '102.9%', label: '生物量增長' }, { value: '1% COS', label: '最佳處理' }, { value: 'Bacillota', label: '關鍵菌門' }, { value: '16S rRNA', label: '測序方法' }],
      methodology: { question: '可降解生物刺激素能否與化肥協同提升玉米氮利用率（通常低於 40%）？', hypothesis: '殼寡糖及 γ-PGA 能改善玉米氮吸收，並透過根際微生物群落變化促進生長。', method: '量化生物量、養分累積、抗氧化酶及根際細菌群落；16S rRNA 測序 + 隨機森林回歸', prototype: '以 ICBB 2026 論文形式發表。', result: '1% COS 處理使生物量增長 102.9%，Bacillota 被識別為關鍵產量驅動菌門。', next: '拓展至其他作物及田間試驗' }
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
