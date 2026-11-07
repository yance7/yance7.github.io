import type { AcademicsLocaleCopy } from '../types.ts'

export const academicsCopy = {
  stats: [
    { value: '4.0', label: 'GPA', note: '4.0/4.0 · 未加權' },
    { value: '1560', label: 'SAT Superscore', note: '閱讀與寫作 760 · 數學 800' },
    { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
    { value: '8.0', label: 'IELTS', note: 'L8.5 · R8.5 · W7.5 · S6.5' }
  ],
  satSingle: { label: 'SAT 單次成績', value: '1510', note: '閱讀與寫作 710 · 數學 800' },
  apScores: [
    { name: '微積分 BC', en: 'Calculus BC', year: 'Grade 10', score: 5, status: 'done' },
    { name: '物理 1', en: 'Physics 1', year: 'Grade 10', score: 5, status: 'done' },
    { name: '電腦科學 A', en: 'Computer Science A', year: 'Grade 10', score: 5, status: 'done' },
    { name: '生物學', en: 'Biology', year: 'Grade 11', score: 5, status: 'done' },
    { name: '化學', en: 'Chemistry', year: 'Grade 11', score: 5, status: 'done' },
    { name: '統計學', en: 'Statistics', year: 'Grade 11', score: 5, status: 'done' },
    { name: '環境科學', en: 'Environmental Science', year: 'Grade 11', score: 5, status: 'done' },
    { name: '電腦科學原理', en: 'Computer Science Principles', year: 'Grade 11', score: 5, status: 'done' },
    { name: '微觀經濟學', en: 'Microeconomics', year: 'Grade 11', score: 5, status: 'done' },
    { name: '物理 C 力學', en: 'Physics C: Mechanics', year: 'Grade 12', score: null, status: 'pending' },
    { name: '物理 C 電磁學', en: 'Physics C: E&M', year: 'Grade 12', score: null, status: 'pending' },
    { name: '宏觀經濟學', en: 'Macroeconomics', year: 'Grade 12', score: null, status: 'pending' }
  ],
  sections: {
    scoreboard: { label: 'SCOREBOARD', title: '數字不會說謊，', accent: '但努力會', copy: 'GPA、標化考試與英語能力測試，是努力留下的可讀痕跡。' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP 成績', accent: '檔案', copy: '9 門已完成的 AP 均獲 5 分；Grade 12 三門為目前修讀課程，尚無成績。', panelLabel: 'AP SCORE / 2024—2026 · 9 門全部 5 分 · 3 門目前修讀', noScoreLabel: '目前課程 · 尚無成績' }
  }
} satisfies AcademicsLocaleCopy
