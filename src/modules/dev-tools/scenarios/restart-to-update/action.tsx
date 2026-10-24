import { DownloadIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Separator } from 'skytrack-ui/separator'
import type { DevScenarioActionProps } from '../../types'

export default function RestartToUpdateAction({
  onAnnounce,
}: DevScenarioActionProps) {
  return (
    <>
      <Separator
        orientation="vertical"
        className="mx-1.5 h-auto self-stretch"
      />
      <Button
        size="sm"
        variant="outline"
        data-testid="ms-lib-restart"
        title="Mock — no update service in this prototype"
        onClick={() =>
          onAnnounce(
            'Restart to update is a mock in this prototype. No update was checked.',
          )
        }
      >
        <DownloadIcon aria-hidden="true" /> Restart to update
      </Button>
    </>
  )
}
