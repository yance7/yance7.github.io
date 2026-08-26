import { activities, leadership } from '../../community'
import type { CommunityLocaleCopy } from '../types'

export const communityCopy = {
  leadership: leadership.map((item) => ({ ...item })),
  activities: activities.map((item) => ({ ...item }))
} satisfies CommunityLocaleCopy
