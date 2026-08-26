import { research, researchMethodGroups, researchMethods } from '../../research'
import type { ResearchLocaleCopy, ResearchCopy } from '../types'

const entities = Object.fromEntries(research.map((item) => [item.id, {
  title: item.title,
  text: item.text,
  tag: item.tag,
  org: item.org,
  metrics: item.metrics,
  methodology: item.methodology,
  proof: item.proof
}])) as Record<string, ResearchCopy>

export const researchCopy = {
  entities,
  methods: researchMethods.map((item) => ({ ...item })),
  groups: researchMethodGroups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item })) })),
  sections: {
    timeline: { label: 'RESEARCH', title: '研究', accent: '时间轴', copy: '5 个研究项目，按时间倒序呈现结果、论文、代码与产品证据。点击展开方法论，可以继续阅读完整的思考路径。' },
    toolchain: { label: 'METHODS / WORKBENCH', title: '方法与', accent: '技术栈', copy: '我把研究拆成一条可复用的工作链：先定义问题，再用模型验证，最后把结果交付为可以打开的工具。', workbench: 'THE WORKBENCH', workbenchTitle: '从问题到可用结果', workbenchCopy: '模型、工程和实验不是三张清单，而是一条会反复回到问题本身的工作链。', flowLabel: '研究工作链', flow: ['问题', '模型', '交付'], footer: ['研究循环进行中', '问题 → 证据 → 产品'] }
  }
} satisfies ResearchLocaleCopy
