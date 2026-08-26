import { projects } from '../../projects'
import type { ProjectLocaleCopy, ProjectCopy } from '../types'

export const projectsCopy = {
  entities: Object.fromEntries(projects.map((item) => [item.id, {
    title: item.title, value: item.value, description: item.description, role: item.role, discipline: item.discipline, story: item.story
  }])) as Record<string, ProjectCopy>,
  section: { label: 'RELEASED WORLDS', title: '让想法', accent: '可以被打开', copySingular: '一个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。', copyPlural: '个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。' }
} satisfies ProjectLocaleCopy
