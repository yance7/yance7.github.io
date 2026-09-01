import { projects } from '../../projects'
import type { ProjectLocaleCopy, ProjectCopy } from '../types'

export const projectsCopy = {
  entities: Object.fromEntries(projects.map((item) => [item.id, {
    title: item.title, value: item.value, description: item.description, role: item.role, discipline: item.discipline, story: item.story
  }])) as Record<string, ProjectCopy>,
  section: { label: 'RELEASED WORLDS', title: '让想法', accent: '可以被打开', copySingular: '一个持续构建的小世界，记录想法如何离开纸面，成为可以使用或继续生长的成果。', copyPlural: '个持续构建的小世界，记录想法如何离开纸面，成为可以使用或继续生长的成果。' }
} satisfies ProjectLocaleCopy
