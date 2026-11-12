import { Badge } from '@cloudflare/kumo'
import type { RecordState } from '../../../shared/content'

export const stateLabel: Record<RecordState, string> = {
  published: 'Tayang',
  draft: 'Draft',
  taken_down: 'Diturunkan',
  trashed: 'Trash',
}

/** Where a project or article stands; "Tayang · ada perubahan" when the draft has edits not yet published. */
export function StateBadge({ state, dirty }: { state: RecordState; dirty?: boolean }) {
  const variant = ({ published: 'success', draft: 'neutral', taken_down: 'warning', trashed: 'outline' } as const)[state]
  return (
    <Badge variant={variant} appearance="dot">
      {stateLabel[state]}
      {state === 'published' && dirty ? ' · ada perubahan' : ''}
    </Badge>
  )
}
