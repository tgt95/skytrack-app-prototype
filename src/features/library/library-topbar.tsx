import { CloudIcon, DiscordLogoIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Tabs, TabsIndicator, TabsList, TabsTab } from 'skytrack-ui/tabs'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import {
  ToastClose,
  ToastContent,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager
} from 'skytrack-ui/toast'
import { Separator } from 'skytrack-ui/separator'
import skytrackLogoFull from '../../assets/skytrack-logo-full.svg?raw'
import DevScenarioSlot from '../dev-tools/dev-scenario-slot'
import { DEV_SCENARIO_SLOTS } from '../dev-tools/scenario-slots'

export const runEnvironmentToastManager = createToastManager()

function RunEnvironmentToastList () {
  const { toasts } = useToastManager()
  return toasts.map(toast => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div className='min-w-0 flex-1'>
          <ToastTitle />
        </div>
        <ToastClose size='icon' variant='ghost' aria-label='Dismiss toast' />
      </ToastContent>
    </ToastRoot>
  ))
}

export default function LibraryTopbar ({
  runEnvironment,
  canUseCloudSIM,
  onEnvironmentChange,
  onAnnounce,
  onNavigateHome
}: {
  runEnvironment: 'local' | 'cloud'
  canUseCloudSIM: boolean
  onEnvironmentChange: (value: 'local' | 'cloud') => void
  onAnnounce: (message: string) => void
  onNavigateHome: () => void
}) {
  return (
    <>
      <ToastProvider toastManager={runEnvironmentToastManager}>
        <ToastPortal>
          <ToastViewport className='fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse'>
            <RunEnvironmentToastList />
          </ToastViewport>
        </ToastPortal>
      </ToastProvider>
      <header
        className='sticky top-0 z-20 flex-[0_0_auto] flex items-center justify-between gap-3 min-h-12 py-2 px-3 border-b border-b-border bg-(--card) [@media_(max-width:_61.25rem)]:flex-wrap'
        data-testid='ms-lib-top'
      >
        <button
          type='button'
          className='inline-flex items-center gap-2 rounded-(--radius) bg-transparent p-0 [border:0] [font:inherit] font-bold text-sm text-inherit cursor-pointer [&_svg]:block [&_svg]:h-6 focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1'
          aria-label='Go to Home'
          title='Go to Home'
          data-testid='ms-lib-logo-home'
          onClick={onNavigateHome}
        >
          <span
            className='inline-flex items-center gap-2'
            aria-hidden='true'
            dangerouslySetInnerHTML={{ __html: skytrackLogoFull }}
          />
        </button>
        <span
          className=' flex items-center gap-2'
          data-testid='ms-lib-top-actions'
        >
          <div
            className=' inline-flex items-center gap-2'
            data-testid='ms-run-environment'
          >
            <span
              className=' text-(--muted-foreground) text-sm whitespace-nowrap'
              data-testid='ms-run-environment-label'
            >
              Environment:
            </span>
            <TooltipProvider>
              <Tabs
                className='w-fit'
                value={runEnvironment}
                onValueChange={(value: unknown) => {
                  const next =
                    value === 'local'
                      ? 'local'
                      : value === 'cloud' && canUseCloudSIM
                      ? 'cloud'
                      : null
                  if (!next || next === runEnvironment) return
                  onEnvironmentChange(next)
                  runEnvironmentToastManager.add({
                    title: `Switched to ${
                      next === 'local' ? 'Local Docker' : 'Cloud'
                    }`
                  })
                }}
              >
                <TabsList variant='filled' aria-label='Running environment'>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <TabsTab
                          value='local'
                          size='sm'
                          aria-label='Local Docker'
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='16'
                            height='16'
                            viewBox='0 0 16 16'
                            fill='none'
                            aria-hidden='true'
                          >
                            <circle cx='8' cy='8' r='7' fill='#1794D4' />
                            <path d='M9 3.5H8V4.5H9V3.5Z' fill='white' />
                            <path d='M5 5H6V6H5V5Z' fill='white' />
                            <path
                              d='M3.00077 8.4707C3.08622 9.92135 3.95013 12 6.99999 12C10.4 12 11.9167 9.50001 12.25 8.25001C12.6667 8.25001 13.6 8.00001 14 7.00001C13.75 6.75 12.75 6.75 12.25 7.00001C12.25 6.60001 12 5.75 11.5 5.5C11.1667 5.83333 10.65 6.7 11.25 7.5C11 7.99999 10.3334 8 10 8H3.47145C3.20671 8 2.98521 8.20642 3.00077 8.4707Z'
                              fill='white'
                            />
                            <path d='M4.5 6.5H3.5V7.5H4.5V6.5Z' fill='white' />
                            <path d='M5 6.5H6V7.5H5V6.5Z' fill='white' />
                            <path d='M7.5 6.5H6.5V7.5H7.5V6.5Z' fill='white' />
                            <path d='M8 6.5H9V7.5H8V6.5Z' fill='white' />
                            <path
                              d='M10.5 6.5H9.5V7.5H10.5V6.5Z'
                              fill='white'
                            />
                            <path d='M7.5 5H6.5V6H7.5V5Z' fill='white' />
                            <path d='M8 5H9V6H8V5Z' fill='white' />
                          </svg>
                        </TabsTab>
                      }
                    />
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          Uses your computer’s local CPU and memory. Requires
                          Docker to be running.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <Tooltip>
                    {canUseCloudSIM
                      ? (
                        <TooltipTrigger
                          render={
                            <TabsTab
                              value='cloud'
                              size='sm'
                              aria-label='Cloud'
                            >
                              <CloudIcon aria-hidden='true' size={16} />
                            </TabsTab>
                          }
                        />
                      )
                      : (
                        <TooltipTrigger
                          render={
                            <span
                              className='inline-flex h-full'
                              tabIndex={0}
                              aria-label='Cloud SIM access required'
                            />
                          }
                        >
                          <TabsTab
                            value='cloud'
                            size='sm'
                            aria-label='Cloud'
                            disabled
                          >
                            <CloudIcon aria-hidden='true' size={16} />
                          </TabsTab>
                        </TooltipTrigger>
                      )}
                    <TooltipPortal>
                      <TooltipPositioner side='bottom' sideOffset={8}>
                        <TooltipPopup>
                          <TooltipArrow />
                          {!canUseCloudSIM ? 'Cloud SIM access required. ' : ''}
                          Runs remotely via cloud infrastructure. Requires an
                          active internet connection.
                        </TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <TabsIndicator variant='pill' />
                </TabsList>
              </Tabs>
            </TooltipProvider>
          </div>

          <Separator
            orientation='vertical'
            className='mx-1.5 h-auto self-stretch'
          />

          <DevScenarioSlot
            name={DEV_SCENARIO_SLOTS.libraryTopbarActions}
            onAnnounce={onAnnounce}
          />

          <Tooltip>
            <TooltipTrigger render={<span className='inline-flex' />}>
              <Button
                size='icon-sm'
                variant='outline'
                data-testid='ms-lib-discord'
                title='Join Discord'
                onClick={() => onAnnounce('Discord community')}
              >
                <DiscordLogoIcon
                  weight='fill'
                  aria-hidden='true'
                  fill='#5865F2'
                />
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
      </header>{' '}
    </>
  )
}
