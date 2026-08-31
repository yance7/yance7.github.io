import type { UiMessages } from '../types'
import { zhCNMessages } from './zh-CN'

export const zhHKMessages = {
  ...zhCNMessages,
  navigation: { main: '主要導覽', mobile: '流動版導覽', home: '首頁', openMenu: '開啟導覽', closeMenu: '關閉導覽' },
  theme: { light: '明亮', dark: '深色', switchToLight: '切換至明亮主題', switchToDark: '切換至深色主題' },
  locale: { selector: '語言選擇', zhCN: '簡', zhHK: '繁', en: 'EN', switchToZhCN: '切換至簡體中文', switchToZhHK: '目前語言：繁體中文', switchToEnglish: 'Switch to English' },
  accessibility: { skipToMain: '跳到主要內容', readingProgress: '閱讀進度', home: '返回首頁', footerHome: '返回個人檔案首頁', liveProduct: '開啟產品網站', projectStory: '項目故事' },
  common: { online: '在線', current: '目前', previous: '上一張', next: '下一張', readPaper: '閱讀論文', openProject: '開啟項目', proof: '證據', source: '原始碼', deployedAs: '上線為', liveProduct: '在線產品', project: '項目', projectNote: '項目說明', chapters: '章節', proofLinks: '證據 / 連結', role: '角色', stack: '技術棧', single: '單曲', copyCitation: '複製引用', copyInProgress: '複製中…', copied: '已複製', copyFailed: '複製失敗，請手動複製' },
  actions: { selectedWork: '查看精選作品', exploreWorlds: '瀏覽五個小世界', scrollToExplore: '向下探索', readResearch: '閱讀研究', viewCaseStudy: '查看產品案例', exploreAcademics: '探索學業', viewHonors: '查看榮譽', enterProject: '進入項目', sourceCode: '原始碼', openResearch: '開啟研究' },
  home: { identity: '研究者 / 建構者 / 音樂聽眾', researchLabel: '研究', selectedWorkLabel: '精選作品', productLabel: '產品', researchToProduct: '研究 → 產品', exploreLabel: '探索', worldsDescription: '把探索、榮譽、研究、作品與音樂分別收進五間屋子。', beyondLabel: '實驗室之外', leadership: '領導力', selectedActivities: '精選活動' },
  research: { ...zhCNMessages.research, expandMethodology: '展開方法論', collapseMethodology: '收起方法論', question: '問題', hypothesis: '假設', method: '方法', prototype: '原型', result: '結果', next: '下一步', workbench: '研究工作台', toolsInRotation: '輪換中的工具', researchLoopActive: '研究循環進行中', questionToEvidenceToProduct: '問題 → 證據 → 產品', toolsCount: '工具', methodsLabel: '方法與技術棧' },
  honors: { filterLabel: '榮譽分類篩選', all: '全部', peak: '領航級', excellent: '卓越級', emerging: '新銳級', honorsUnit: '項榮譽' },
  lightbox: { gallery: '演唱會海報大圖', close: '關閉燈箱', previous: '上一張', next: '下一張', position: (current, total) => `，第 ${current} 張，共 ${total} 張`, loading: '正在載入圖片', failed: '圖片載入失敗', retry: '重試', posterAlt: '海報', openArchive: '開啟檔案' },
  albums: { collection: '專輯收藏牆', navigation: '專輯切換控制', previous: '上一張專輯', next: '下一張專輯', select: '選擇一張專輯', selected: '已選擇', nowSpinning: '正在播放', album: '專輯', ep: 'EP' },
  footer: { homeLabel: '返回首頁', contactsLabel: '聯絡方式', archive: '個人檔案 / 2026', identity: '研究者 / 建構者 / 音樂聽眾', email: '電郵', github: 'GitHub', instagram: 'Instagram', x: 'X' },
  error404: { kicker: '訊號遺失', title: '這一頁走失了', copy: '你訪問的頁面不存在，或者已經被移走。返回主頁，重新選擇一間屋子走進去。', home: '返回首頁', research: '看看研究' },
  loadError: { title: '頁面暫時無法載入', copy: '目前頁面資源未完成載入，請重新載入後再試。', retry: '重新載入' },
  status: { active: '進行中', published: '已發表', completed: '已完成', deployed: '已部署', 'open-source': '開放原始碼', planned: '計劃中', archived: '已歸檔' },
  page: {
    home: { kicker: '個人檔案 / 北京 · 2026', title: 'SONG NOTES', copy: '這裡收錄研究、已上線的作品，以及被音樂和現場照亮的生活片段。先從一個真實問題開始，再沿着證據走到可以使用的結果。' },
    academics: { kicker: '學業', title: '明日從此的座標', copy: 'GPA、標化考試與 AP 成績，是努力留下的可讀痕跡。' },
    honors: { kicker: '榮譽', title: '一步一步往上爬', copy: '獎項是座標，不是終點；真正重要的是仍然保持向上的慣性。' },
    research: { kicker: '研究', title: '我不完美的夢，你陪着我想', copy: '從智慧農業到可解釋 AI，把論文中的模型推向瀏覽器裡可以操作的產品。' },
    works: { kicker: '作品', title: '因為我已慢慢懂，努力就能成功', copy: '一個已經上線的小世界，記錄想法如何離開紙面，開始被真實使用。' },
    concerts: { kicker: '演唱會', title: '緣分讓我們相遇亂世以外', copy: '演唱會足跡與海報，記錄那些被燈光和合唱重新定義的夜晚。' }
  }
} satisfies UiMessages
