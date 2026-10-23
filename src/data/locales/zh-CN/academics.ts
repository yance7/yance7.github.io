import { apScores, education, stats } from '../../academics.ts'
import type { AcademicsLocaleCopy } from '../types.ts'

export const academicsCopy = {
  stats: stats.map((item) => ({ ...item })),
  satSingle: { label: 'SAT 单次成绩', value: '1510', note: '阅读与写作 710 · 数学 800' },
  education: education.map((item) => ({ ...item })),
  apScores: apScores.map((item) => ({ ...item })),
  sections: {
    education: { label: 'EDUCATION', title: '学习轨迹', accent: '两段经历', copy: '记录当前阶段与近年的学习轨迹，保留必要的公开信息。' },
    scoreboard: { label: 'SCOREBOARD', title: '数字不会说谎，', accent: '但努力会', copy: '绩点、标化与英语能力测试，是努力留下的可读痕迹。' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP 成绩', accent: '档案', copy: '9 门已完成的 AP 均获 5 分；Grade 12 三门当前课程尚无成绩。', panelLabel: 'AP SCORE / 2024—2026 · 9 门全部 5 分 · 3 门当前课程', noScoreLabel: '当前课程 · 尚无成绩' }
  }
} satisfies AcademicsLocaleCopy
