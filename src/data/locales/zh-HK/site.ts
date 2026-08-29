import type { SiteLocaleCopy } from '../types'

export const siteCopy = {
  pageMeta: {
    home: { kicker: '個人檔案 / 北京 · 2026', title: 'SONG NOTES', copy: '這裡收錄研究、已上線的作品，以及被音樂和現場照亮的生活片段。先從一個真實問題開始，再沿着證據走到可以使用的結果。' },
    academics: { kicker: '學業', title: '明日從此的座標', copy: 'GPA、標化考試與 AP 成績，是努力留下的可讀痕跡。', credit: { artist: '林俊傑', song: '明日坐標', album: '明日坐標' } },
    honors: { kicker: '榮譽', title: '一步一步往上爬', copy: '獎項是座標，不是終點；真正重要的是仍然保持向上的慣性。', credit: { artist: '周杰倫', song: '蝸牛', album: 'Fantasy Plus' } },
    research: { kicker: '研究', title: '我不完美的夢，你陪着我想', copy: '從智慧農業到可解釋 AI，把論文中的模型推向瀏覽器裡可以操作的產品。', credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我們的時光' } },
    works: { kicker: '作品', title: '因為我已慢慢懂，努力就能成功', copy: '一個已經上線的小世界，記錄想法如何離開紙面，開始被真實使用。', credit: { artist: '汪蘇瀧', song: '慢慢懂', album: '慢慢懂' } },
    concerts: { kicker: '演唱會', title: '緣分讓我們相遇亂世以外', copy: '演唱會足跡與海報，記錄那些被燈光和合唱重新定義的夜晚。', credit: { artist: '鄧紫棋', song: '光年之外', album: '' } }
  },
  nav: {
    home: { label: '首頁', desc: '個人檔案入口' },
    academics: { label: '學業', desc: 'GPA、標化考試與 AP 成績' },
    honors: { label: '榮譽', desc: '獎項與競賽紀錄' },
    research: { label: '研究', desc: '由論文到產品' },
    works: { label: '作品', desc: '已上線的項目' },
    concerts: { label: '演唱會', desc: '現場記憶檔案' }
  },
  sections: {
    home: [{ id: 'selected-work', label: '精選作品', shortLabel: '作品' }, { id: 'home-worlds', label: '五個小世界', shortLabel: '世界' }, { id: 'home-beyond', label: '實驗室之外', shortLabel: '之外' }],
    academics: [{ id: 'sec-education', label: '教育履歷', shortLabel: '教育' }, { id: 'sec-scoreboard', label: '成績看板', shortLabel: '成績' }, { id: 'sec-ap-archive', label: 'AP 檔案', shortLabel: 'AP' }],
    honors: [{ id: 'sec-milestones', label: '榮譽里程碑', shortLabel: '里程碑' }, { id: 'sec-honors-archive', label: '榮譽檔案', shortLabel: '檔案' }],
    research: [{ id: 'sec-research-timeline', label: '研究時間軸', shortLabel: '研究' }, { id: 'sec-toolchain', label: '方法與技術棧', shortLabel: '方法' }],
    works: [{ id: 'works-overview', label: '已發佈作品', shortLabel: '作品' }, { id: 'project-fresheye', label: 'FreshEye', shortLabel: 'FreshEye' }],
    concerts: [{ id: 'concerts-overview', label: '現場檔案', shortLabel: '現場' }, { id: 'concert-archive', label: '演唱會檔案', shortLabel: '海報' }, { id: 'album-frequencies', label: '專輯收藏牆', shortLabel: '專輯' }]
  },
  worlds: {
    academics: { no: '01', label: '學業', icon: '✦', desc: 'GPA、標化考試與 AP 成績，是努力留下的可讀痕跡。', accent: 'aqua' },
    honors: { no: '02', label: '榮譽', icon: '❖', desc: '獎項是座標，不是終點；真正重要的是仍然保持向上的慣性。', accent: 'violet' },
    research: { no: '03', label: '研究', icon: '◉', desc: '從智慧農業到可解釋 AI，把論文中的模型推向瀏覽器裡可以操作的產品。', accent: 'gold' },
    works: { no: '04', label: '作品', icon: '♬', desc: '一個已經上線的小世界，記錄想法如何離開紙面，開始被真實使用。', accent: 'aqua' },
    concerts: { no: '05', label: '演唱會', icon: '♪', desc: '演唱會足跡與海報，記錄那些被燈光和合唱重新定義的夜晚。', accent: 'gold' }
  },
  home: {
    heroTitle: '研究、建構，', heroAccent: '與現場相遇',
    selectedTitle: '研究如何', selectedAccent: '離開紙面', selectedCopy: '先看正在繼續推進的研究，再看已經可以開啟使用的產品。',
    worldsTitle: '五個', worldsAccent: '小世界', worldsCopy: '把學業、榮譽、研究、作品與音樂分別收進五間屋子。',
    beyondTitle: '在群體中', beyondAccent: '繼續成長', beyondCopy: '精選領導力與活動經歷，保留最能說明組織、協作與行動力的片段。'
  }
} satisfies SiteLocaleCopy
