import { EmptyState } from './ui/EmptyState'
import { Button } from './ui/Button'
import { IconRefresh, IconAlert } from './ui/Icons'

export function LoadError({
  title = 'Could not load this section',
  message = 'Please check your connection and try again.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={<IconAlert className="h-6 w-6" />}
      title={title}
      description={message}
      action={
        onRetry ? (
          <Button variant="secondary" fullWidth icon={<IconRefresh className="h-4 w-4" />} onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  )
}
