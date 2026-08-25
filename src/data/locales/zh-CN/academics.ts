import { apScores, education, stats } from '../../academics'
import type { AcademicsLocaleCopy } from '../types'

export const academicsCopy = {
  stats: stats.map((item) => ({ ...item })),
  education: education.map((item) => ({ ...item })),
  apScores: apScores.map((item) => ({ ...item })),
  sections: {
    education: { label: 'EDUCATION', title: '学习轨迹', accent: '两段经历', copy: '记录当前阶段与近年的学习轨迹，保留必要的公开信息。' },
    scoreboard: { label: 'SCOREBOARD', title: '数字不会说谎，', accent: '但努力会', copy: '绩点、标化与英语能力测试，是努力留下的可读痕迹。' },
    apArchive: { label: 'AP ARCHIVE', title: 'AP 成绩', accent: '档案', copy: '9 门 AP 全部 5 分，覆盖理科、社科与计算机；Grade 12 三门待出分。', panelLabel: 'AP SCORE / 2024—2026 · 9 门全部 5 分 · 3 门待出分' }
  }
} satisfies AcademicsLocaleCopy
