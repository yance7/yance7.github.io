import type { AcademicsLocaleCopy } from '../types'

export const academicsCopy = {
  stats: [
    { value: '4.0', label: 'GPA', note: 'Unweighted scale' },
    { value: '1490', label: 'SAT', note: 'Math 800 · Reading and Writing 690' },
    { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
    { value: '7.5', label: 'IELTS', note: 'L8 · R9 · W7.5 · S6' }
  ],
  education: [
    { period: '2024.02 — present', name: 'International Department, Beijing No. 80 High School', en: 'International Department, Beijing No. 80 High School' },
    { period: '2021.09 — 2024.01', name: 'Beijing Chen Jinglun Middle School, Tuanjiehu Branch', en: 'Beijing Chen Jinglun Middle School, Tuanjiehu Branch' }
  ],
  apScores: [
    { name: 'Calculus BC', en: 'Calculus BC', year: 'Grade 10', score: 5, status: 'done' },
    { name: 'Physics 1', en: 'Physics 1', year: 'Grade 10', score: 5, status: 'done' },
    { name: 'Computer Science A', en: 'Computer Science A', year: 'Grade 10', score: 5, status: 'done' },
    { name: 'Biology', en: 'Biology', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Chemistry', en: 'Chemistry', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Statistics', en: 'Statistics', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Environmental Science', en: 'Environmental Science', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Computer Science Principles', en: 'Computer Science Principles', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Microeconomics', en: 'Microeconomics', year: 'Grade 11', score: 5, status: 'done' },
    { name: 'Physics C: Mechanics', en: 'Physics C: Mechanics', year: 'Grade 12', score: null, status: 'pending' },
    { name: 'Physics C: E&M', en: 'Physics C: E&M', year: 'Grade 12', score: null, status: 'pending' },
    { name: 'Macroeconomics', en: 'Macroeconomics', year: 'Grade 12', score: null, status: 'pending' }
  ],
  sections: {
    education: { label: 'EDUCATION', title: 'Academic record', accent: 'two chapters', copy: 'A compact record of the current school stage and the years that led here.' },
    scoreboard: { label: 'SCOREBOARD', title: 'Numbers are honest,', accent: 'effort is visible', copy: 'GPA, standardized tests, and English scores make sustained work legible.' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP results', accent: 'on record', copy: 'Nine AP exams at 5, across science, social science, and computing; three Grade 12 results pending.', panelLabel: 'AP SCORE / 2024—2026 · 9 AT 5 · 3 PENDING' }
  }
} satisfies AcademicsLocaleCopy
