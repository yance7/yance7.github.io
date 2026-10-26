import type { AcademicsLocaleCopy } from '../types.ts'

export const academicsCopy = {
  stats: [
    { value: '4.0', label: 'GPA', note: '4.0/4.0 · Unweighted' },
    { value: '1560', label: 'SAT Superscore', note: 'Reading and Writing 760 · Math 800' },
    { value: '108', label: 'TOEFL', note: 'R29 · L27 · S23 · W29' },
    { value: '8.0', label: 'IELTS', note: 'L8.5 · R8.5 · W7.5 · S6.5' }
  ],
  satSingle: { label: 'SAT single sitting', value: '1510', note: 'Reading and Writing 710 · Math 800' },
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
    { name: 'Physics C: Electricity and Magnetism', en: 'Physics C: Electricity and Magnetism', year: 'Grade 12', score: null, status: 'pending' },
    { name: 'Macroeconomics', en: 'Macroeconomics', year: 'Grade 12', score: null, status: 'pending' }
  ],
  sections: {
    education: { label: 'EDUCATION', title: 'Academic record', accent: 'two chapters', copy: 'A compact record of the current school stage and the years that led here.' },
    scoreboard: { label: 'SCOREBOARD', title: 'Numbers are honest,', accent: 'effort is visible', copy: 'GPA, standardized tests, and English scores make sustained work legible.' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP results', accent: 'on record', copy: 'All nine completed AP exams received a 5; three Grade 12 courses are in progress with no scores yet.', panelLabel: 'AP SCORE / 2024—2026 · 9 SCORES OF 5 · 3 CURRENT COURSES', noScoreLabel: 'Current course · No score yet' }
  }
} satisfies AcademicsLocaleCopy
