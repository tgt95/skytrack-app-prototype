import { CloudIcon, DiscordLogoIcon, DownloadIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Separator } from 'skytrack-ui/separator'
import { Tabs, TabsIndicator, TabsList, TabsTab } from 'skytrack-ui/tabs'
import { Tooltip, TooltipArrow, TooltipPopup, TooltipPortal, TooltipPositioner, TooltipProvider, TooltipTrigger } from 'skytrack-ui/tooltip'
import { ToastClose, ToastContent, ToastPortal, ToastProvider, ToastRoot, ToastTitle, ToastViewport, createToastManager, useToastManager } from 'skytrack-ui/toast'
import skytrackLogoFull from '../../assets/skytrack-logo-full.svg?raw'

export const runEnvironmentToastManager = createToastManager()

function RunEnvironmentToastList() {
  const { toasts } = useToastManager()
  return toasts.map((toast) => <ToastRoot key={toast.id} toast={toast}><ToastContent><div className='min-w-0 flex-1'><ToastTitle /></div><ToastClose size='icon' variant='ghost' aria-label='Dismiss toast' /></ToastContent></ToastRoot>)
}

export default function LibraryTopbar({ runEnvironment, canUseCloudSIM, onEnvironmentChange, onAnnounce }: {
  runEnvironment: 'local' | 'cloud'
  canUseCloudSIM: boolean
  onEnvironmentChange: (value: 'local' | 'cloud') => void
  onAnnounce: (message: string) => void
}) {
  return (
    <>
      <ToastProvider toastManager={runEnvironmentToastManager}>
        <ToastPortal><ToastViewport className='fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse'><RunEnvironmentToastList /></ToastViewport></ToastPortal>
      </ToastProvider>
      <header className='ms-lib-top'>
        <span
          className='ms-lib-brand'
          role='img'
          aria-label='SkyTrack'
          dangerouslySetInnerHTML={{ __html: skytrackLogoFull }}
        />
        <span className='ms-lib-top-actions'>
          <div className='ms-run-environment'>
            <span className='ms-run-environment-label'>Environment:</span>
            <TooltipProvider>
              <Tabs
                className='w-fit'
                value={runEnvironment}
                onValueChange={(value: unknown) => {
                  const next = value === 'local' ? 'local' : value === 'cloud' && canUseCloudSIM ? 'cloud' : null
                  if (!next || next === runEnvironment) return
                  onEnvironmentChange(next)
                  runEnvironmentToastManager.add({
                    title: `Switched to ${next === 'local' ? 'Local Docker' : 'Cloud'}`
                  })
                }}
              >
                <TabsList variant='filled' aria-label='Running environment'>
                  <Tooltip>
                    <TooltipTrigger render={<span className='inline-flex' />}>
                      <TabsTab value='local' size='sm' aria-label='Local Docker'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                          <circle cx='8' cy='8' r='7' fill='#1794D4' />
                          <path d='M9 3.5H8V4.5H9V3.5Z' fill='white' />
                          <path d='M5 5H6V6H5V5Z' fill='white' />
                          <path d='M3.00077 8.4707C3.08622 9.92135 3.95013 12 6.99999 12C10.4 12 11.9167 9.50001 12.25 8.25001C12.6667 8.25001 13.6 8.00001 14 7.00001C13.75 6.75 12.75 6.75 12.25 7.00001C12.25 6.60001 12 5.75 11.5 5.5C11.1667 5.83333 10.65 6.7 11.25 7.5C11 7.99999 10.3334 8 10 8H3.47145C3.20671 8 2.98521 8.20642 3.00077 8.4707Z' fill='white' />
                          <path d='M4.5 6.5H3.5V7.5H4.5V6.5Z' fill='white' />
                          <path d='M5 6.5H6V7.5H5V6.5Z' fill='white' />
                          <path d='M7.5 6.5H6.5V7.5H7.5V6.5Z' fill='white' />
                          <path d='M8 6.5H9V7.5H8V6.5Z' fill='white' />
                          <path d='M10.5 6.5H9.5V7.5H10.5V6.5Z' fill='white' />
                          <path d='M7.5 5H6.5V6H7.5V5Z' fill='white' />
                          <path d='M8 5H9V6H8V5Z' fill='white' />
                        </svg>
                      </TabsTab>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          Uses your computer’s local CPU and memory. Requires Docker to be running.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<span className='inline-flex' tabIndex={canUseCloudSIM ? undefined : 0} aria-label={!canUseCloudSIM ? 'Cloud SIM access required' : undefined} />}>
                      <TabsTab value='cloud' size='sm' aria-label='Cloud' disabled={!canUseCloudSIM}>
                        <CloudIcon aria-hidden='true' size={16} />
                      </TabsTab>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          {!canUseCloudSIM ? 'Cloud SIM access required. ' : ''}
                          Runs remotely via cloud infrastructure. Requires an active internet connection.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <TabsIndicator variant='pill' />
                </TabsList>
              </Tabs>
            </TooltipProvider>
          </div>

          <Separator orientation='vertical' className='mx-1.5 h-auto self-stretch' />

          <Button
            size='sm'
            variant='outline'
            data-testid='ms-lib-restart'
            title='Mock — no update service in this prototype'
            onClick={() => onAnnounce('Restart to update is a mock in this prototype. No update was checked.')}
          >
            <DownloadIcon aria-hidden='true' /> Restart to update
          </Button>



          <Tooltip>
            <TooltipTrigger render={<span className='inline-flex' />}>
              <Button
                size='icon-sm'
                variant='outline'
                data-testid='ms-lib-restart'
                title='Mock — no update service in this prototype'
                onClick={() => onAnnounce('Join Discord is a mock in this prototype.')}
              >
                <DiscordLogoIcon weight='fill' aria-hidden='true' fill='#5865F2' />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner side='bottom' sideOffset={8}>
                <TooltipPopup>
                  <TooltipArrow />
                  Join Discord
                </TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>

        </span>
      </header>    </>
  )
}
