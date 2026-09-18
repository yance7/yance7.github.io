import { activities, leadership } from '../../community.ts'
import type { CommunityLocaleCopy } from '../types.ts'

export const communityCopy = {
  leadership: leadership.map((item) => ({ ...item })),
  activities: activities.map((item) => ({ ...item }))
} satisfies CommunityLocaleCopy
