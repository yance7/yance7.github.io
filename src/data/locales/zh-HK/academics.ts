import type { AcademicsLocaleCopy } from '../types'

export const academicsCopy = {
  stats: [
    { value: '4.0', label: 'GPA', note: '未加權滿分 GPA' },
    { value: '1490', label: 'SAT', note: '數學 800 · 語文 690' },
    { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
    { value: '7.5', label: 'IELTS', note: 'L8 · R9 · W7.5 · S6' }
  ],
  education: [
    { period: '2024.02 — 至今', name: '北京市第八十中學國際部', en: 'International Department, Beijing No. 80 High School' },
    { period: '2021.09 — 2024.01', name: '北京陳經綸中學團結湖分校', en: 'Beijing Chen Jinglun Middle School, Tuanjiehu Branch' }
  ],
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
    education: { label: 'EDUCATION', title: '學習軌跡', accent: '兩段經歷', copy: '記錄目前階段與近年的學習軌跡，保留必要的公開資訊。' },
    scoreboard: { label: 'SCOREBOARD', title: '數字不會說謊，', accent: '但努力會', copy: 'GPA、標化考試與英語能力測試，是努力留下的可讀痕跡。' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP 成績', accent: '檔案', copy: '9 門 AP 全部 5 分，涵蓋理科、社科與電腦科學；Grade 12 三門待出分。', panelLabel: 'AP SCORE / 2024—2026 · 9 門全部 5 分 · 3 門待出分' }
  }
} satisfies AcademicsLocaleCopy
