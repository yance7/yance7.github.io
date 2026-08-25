import type { CommunityLocaleCopy } from '../types'

export const communityCopy = {
  leadership: [
    { role: 'President', org: 'iHOSA Technology Innovation Club', period: '2025.09 — 2026.09', note: '' },
    { role: 'Vice President', org: 'Biology Club', period: '2025.09 — 2026.09', note: '' },
    { role: 'Chair', org: 'Student Self-Management Committee', period: '2025.09 — 2026.09', note: '' },
    { role: 'Vice Chair', org: 'Student Self-Management Committee', period: '2024.09 — 2025.09', note: '' }
  ],
  activities: [
    { id: 'low-carbon-volunteer', featured: true, title: 'Protect the Earth, Live Low-Carbon', period: '2024.03 — 2024.04', org: 'Beijing Volunteer Federation', detail: 'Completed 72 hours of service and produced social videos promoting organic produce and energy-saving habits.' },
    { id: 'pioneer-analyzing-ai', featured: false, title: 'Pioneer Global Problem-Solving Academy', period: '2024.09 — 2024.12', org: 'Pioneer Global · Analyzing AI', detail: 'Earned an A-. Wrote a report on using AI to help high-school students resist academic dishonesty, examining technology and society.' },
    { id: 'pioneer-research-institute', featured: true, title: 'Pioneer Research Institute', period: '2025.06 — 2025.08', org: 'Pioneer Research Institute · Critical Consciousness in Computing', detail: 'Studied value-sensitive design for agricultural drones, earning an A+ and building a quantitative evaluation framework with SUS.' },
    { id: 'academic-report-forum', featured: false, title: 'Beijing No. 80 High School Academic Forum (VI and VII)', period: '2025.12 & 2026.06', org: 'Beijing No.80 High School', detail: 'Presented research for two consecutive sessions, tracing FishFreshNet from CNN/ResNet through attention mechanisms and multimodal learning.' },
    { id: 'ap-calculus-assistant', featured: true, title: 'AP Calculus BC Teaching Assistant', period: '2025.11 — 2026.04', org: 'Teaching Assistant', detail: 'Helped classmates with differential equations and Taylor series; wrote a 70-page AP Calculus BC study guide.' }
  ]
} satisfies CommunityLocaleCopy
