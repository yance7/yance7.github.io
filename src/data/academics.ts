import type { AcademicStat, ApScore, Education } from './types.ts'

export const academicsUpdatedAt = '2026-10-22'

export const stats = [
  { value: '4.0', label: 'GPA', note: '4.0/4.0 · 未加权' },
  { value: '1560', label: 'SAT Superscore', note: '阅读与写作 760 · 数学 800' },
  { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
  { value: '8.0', label: 'IELTS', note: 'L8.5 · R8.5 · W7.5 · S6.5' }
] satisfies AcademicStat[]

/* ---------- 教育履历 ---------- */
export const education = [
  { period: '2024.02 — 至今', name: '北京市第八十中学国际部', en: 'International Department, Beijing No. 80 High School' },
  { period: '2021.09 — 2024.01', name: '北京陈经纶中学团结湖分校', en: 'Beijing Chen Jinglun Middle School, Tuanjiehu Branch' }
] satisfies Education[]

/* ---------- AP 成绩档案（9 门已得 5 分 + 3 门待出分） ---------- */
export const apScores = [
  { name: '微积分 BC', en: 'Calculus BC', year: 'Grade 10', score: 5, status: 'done' },
  { name: '物理 1', en: 'Physics 1', year: 'Grade 10', score: 5, status: 'done' },
  { name: '计算机科学 A', en: 'Computer Science A', year: 'Grade 10', score: 5, status: 'done' },
  { name: '生物学', en: 'Biology', year: 'Grade 11', score: 5, status: 'done' },
  { name: '化学', en: 'Chemistry', year: 'Grade 11', score: 5, status: 'done' },
  { name: '统计学', en: 'Statistics', year: 'Grade 11', score: 5, status: 'done' },
  { name: '环境科学', en: 'Environmental Science', year: 'Grade 11', score: 5, status: 'done' },
  { name: '计算机科学原理', en: 'Computer Science Principles', year: 'Grade 11', score: 5, status: 'done' },
  { name: '微观经济学', en: 'Microeconomics', year: 'Grade 11', score: 5, status: 'done' },
  { name: '物理 C 力学', en: 'Physics C: Mechanics', year: 'Grade 12', score: null, status: 'pending' },
  { name: '物理 C 电磁学', en: 'Physics C: E&M', year: 'Grade 12', score: null, status: 'pending' },
  { name: '宏观经济学', en: 'Macroeconomics', year: 'Grade 12', score: null, status: 'pending' }
] satisfies ApScore[]

/* ---------- 荣誉奖项（按时间倒序） ---------- */
