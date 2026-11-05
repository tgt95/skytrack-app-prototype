import { AppleLogo, DownloadSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from 'skytrack-ui/accordion'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { PageHeader } from 'skytrack-ui/page-header'
import desktopArt from '../../../assets/download/desktop.svg?raw'
import mobileArt from '../../../assets/download/mobile.svg?raw'
import skytrackOsArt from '../../../assets/download/skytrack-os.svg?raw'
import androidLogo from '../../../assets/download/android.svg?raw'
import ubuntuLogo from '../../../assets/download/ubuntu.svg?raw'
import windowsLogo from '../../../assets/download/windows.svg?raw'
import macOsLogo from '../../../assets/download/mac-os.svg?raw'

const inlineLogo = (svg: string) =>
  svg
    .replace('<svg ', '<svg class="size-full" ')
    .replaceAll('fill="#161616"', 'fill="currentColor"')

const androidMark = inlineLogo(androidLogo)
const ubuntuMark = inlineLogo(ubuntuLogo)
const windowsMark = inlineLogo(windowsLogo)
const macOsMark = inlineLogo(macOsLogo)
const PLATFORMS = [
  {
    id: 'desktop',
    name: 'SkyTrack Desktop',
    cardTitle: 'Desktop',
    illustration: desktopArt,
    summary:
      'Plan missions and review them in the documented local simulation workflow.'
  },
  {
    id: 'field',
    name: 'SkyTrack Field',
    cardTitle: 'Mobile',
    illustration: mobileArt,
    summary:
      'Mobile ground-station application for field use; device support is not yet documented.'
  },
  {
    id: 'os',
    name: 'SkyTrack OS',
    cardTitle: 'SkyTrack OS',
    illustration: skytrackOsArt,
    summary:
      'Onboard autonomy runtime for the companion computer, separate from the flight controller.'
  }
] as const

const DESKTOP_HOSTS = ['macOS', 'Debian / Ubuntu', 'Windows'] as const

const HOST_OPTIONS = [
  {
    label: 'macOS',
    detail: 'Host option listed in the guide',
    icon: null,
    logo: macOsMark
  },
  {
    label: 'Debian / Ubuntu',
    detail: 'Host option listed in the guide',
    icon: null,
    logo: ubuntuMark
  },
  {
    label: 'Windows',
    detail: 'Host option listed in the guide',
    icon: null,
    logo: windowsMark
  }
] as const

function PlatformDetails ({
  platformId,
  hostOs,
  onHostOsChange,
  platformName
}: {
  platformId: string
  hostOs: typeof DESKTOP_HOSTS[number]
  onHostOsChange: (host: typeof DESKTOP_HOSTS[number]) => void
  platformName: string
}) {
  const compatibility =
    platformId === 'desktop'
      ? `${hostOs} is listed as a host option in the Getting Started guide. The guide also lists an internet connection, permission to install Docker Desktop, and a SkyTrack account using a supported provider. Minimum versions and hardware requirements are not specified.`
      : platformId === 'field'
      ? 'The reviewed sources do not include an Android compatibility matrix. Minimum Android versions, supported devices, and distribution channel are not specified.'
      : 'The architecture context names Jetson Nano / Xavier / Orin NX, Raspberry Pi / Compute Module, and Linux SBCs as common hardware. These examples do not certify board compatibility or an OS image. The optional HITL profile is a separate, specific bench scenario.'

  const setupSteps =
    platformId === 'field'
      ? [
          'Install SkyTrack Field from the app channel confirmed by the product team.',
          'Sign in and select the mission prepared in SkyTrack Desktop.',
          'Follow the approved connection and mission-transfer guide before field use.'
        ]
      : [
          'Choose a companion computer and flight-controller combination from the approved compatibility matrix.',
          'Use the installation image and board-specific instructions for that combination.',
          'Verify the onboard runtime and controller integration using the approved setup guide.'
        ]

  const systemRequirements = [
    {
      label: 'Operating System',
      value: `${hostOs} (minimum version not specified)`
    },
    { label: 'CPU', value: 'Not specified in the reviewed guide' },
    { label: 'GPU', value: 'Not specified in the reviewed guide' },
    { label: 'RAM', value: 'Not specified in the reviewed guide' },
    { label: 'Hard Disk', value: 'Not specified in the reviewed guide' }
  ]

  return (
    <section
      aria-live='polite'
      aria-label={`${platformName} compatibility and setup`}
      className='flex min-w-0 flex-col'
    >
      <Accordion
        multiple
        defaultValue={
          platformId === 'desktop'
            ? ['select-os', 'requirements', 'setup']
            : ['requirements', 'setup']
        }
        className='w-full'
      >
        {platformId === 'desktop' && (
          <AccordionItem value='select-os'>
            <AccordionTrigger className='text-lg font-semibold'>
              Select OS
            </AccordionTrigger>
            <AccordionContent>
              <div
                role='group'
                aria-label='Select a Desktop host operating system'
                className='flex md:flex-row gap-3 pb-4'
              >
                {HOST_OPTIONS.map(({ label, detail, icon: HostIcon, logo }) => (
                  <Button
                    key={label}
                    type='button'
                    variant='outline'
                    aria-pressed={hostOs === label}
                    onClick={() => onHostOsChange(label)}
                    className={`h-auto py-3 justify-start gap-3 rounded-(--radius) border-border ${
                      hostOs === label ? 'border-primary text-primary' : ''
                    }`}
                  >
                    {HostIcon ? (
                      <HostIcon
                        aria-hidden='true'
                        className='size-8 shrink-0'
                        weight='fill'
                      />
                    ) : (
                      <span
                        aria-hidden='true'
                        className='size-8 shrink-0 [&>svg]:block'
                        dangerouslySetInnerHTML={{ __html: logo ?? '' }}
                      />
                    )}
                    <span className='flex min-w-0 flex-col items-start gap-1 text-left'>
                      <span className='text-base font-semibold'>{label}</span>
                      <span className='text-sm font-normal text-muted-foreground'>
                        {detail}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value='requirements'>
          <AccordionTrigger className='text-lg font-semibold'>
            {platformId === 'desktop'
              ? 'Minimum system requirements'
              : 'Compatibility'}
          </AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-4 pb-4'>
              {platformId === 'desktop' && (
                <dl className='grid grid-cols-1 gap-2'>
                  {systemRequirements.map(({ label, value }) => (
                    <div
                      key={label}
                      className='grid grid-cols-1 gap-1 sm:grid-cols-4 sm:gap-3'
                    >
                      <dt className='text-base text-muted-foreground sm:col-span-1'>
                        {label}
                      </dt>
                      <dd className='text-base text-foreground sm:col-span-3'>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className='text-base text-muted-foreground'>{compatibility}</p>
              {platformId === 'desktop' && (
                <Button type='button' disabled className='self-start'>
                  <DownloadSimpleIcon aria-hidden='true' />
                  Download
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='setup'>
          <AccordionTrigger className='text-lg font-semibold'>
            Setup guideline
          </AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-5 pb-4'>
              {platformId === 'desktop' ? (
                <>
                  <div className='flex items-center gap-3'>
                    <Badge variant='outline' count='1' />
                    <div className='text-lg font-medium text-foreground'>
                      Configure the compute environment for drone simulation
                    </div>
                  </div>
                  <div className='grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 text-base'>
                    <article className='flex min-w-0 flex-col gap-4 border border-border p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='text-lg font-medium'>
                          Install Docker Desktop
                        </div>
                        <Badge variant='outline'>Local</Badge>
                      </div>
                      <ol className='m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground'>
                        <li>
                          Docker Desktop must be running before local
                          simulation.
                        </li>
                        <li>
                          Enable socket access if required by the host setup.
                        </li>
                        <li>
                          Open a mission to prepare its local simulation
                          runtime.
                        </li>
                      </ol>
                      <div className='mt-auto flex flex-col gap-2'>
                        <div className='text-lg font-medium text-foreground'>
                          You’re ready when
                        </div>
                        <p className='m-0 text-muted-foreground'>
                          Docker is running and the mission’s local simulation
                          runtime is available.
                        </p>
                        <Button type='button' disabled className='self-start'>
                          <DownloadSimpleIcon aria-hidden='true' />
                          Download Docker Desktop
                        </Button>
                      </div>
                    </article>
                    <span className='self-center text-center text-muted-foreground'>
                      or
                    </span>
                    <article className='flex min-w-0 flex-col gap-4 border border-border p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='text-lg font-medium'>
                          Use SkyTrack Cloud
                        </div>
                        <Badge variant='outline'>Cloud</Badge>
                      </div>
                      <p className='m-0 text-muted-foreground'>
                        Cloud simulation is a draft option that needs Owner
                        confirmation. Setup instructions will be added after the
                        service path is confirmed.
                      </p>
                      <Button
                        type='button'
                        disabled
                        variant='outline'
                        className='mt-auto self-start'
                      >
                        Select Cloud
                      </Button>
                    </article>
                  </div>
                  <ol className='m-0 flex list-none flex-col gap-3 p-0 text-muted-foreground'>
                    <li className='flex items-center gap-3'>
                      <Badge variant='outline' className='rounded-none'>
                        2
                      </Badge>
                      <span className='text-lg font-medium text-foreground'>
                        Additional setup steps pending Owner content.
                      </span>
                    </li>
                    <li className='flex items-center gap-3'>
                      <Badge variant='outline' className='rounded-none'>
                        3
                      </Badge>
                      <span className='text-lg font-medium text-foreground'>
                        Additional setup steps pending Owner content.
                      </span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <ol className='m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground'>
                    {setupSteps.map(step => (
                      <li key={step} className='text-base text-foreground'>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <Button type='button' disabled className='self-start'>
                    Open setup guide
                  </Button>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}

export default function DownloadPage ({ onGoHome }: { onGoHome: () => void }) {
  const [activePlatform, setActivePlatform] = useState<string>('desktop')
  const [hostOs, setHostOs] = useState<typeof DESKTOP_HOSTS[number]>('macOS')
  const active = PLATFORMS.find(platform => platform.id === activePlatform)!

  return (
    <div className='min-w-0'>
      <PageHeader
        title='Download'
        // toolbar={
        //   <Button variant='outline' size='sm' onClick={onGoHome}>
        //     Back to Home
        //   </Button>
        // }
      />

      <div className='mx-auto flex w-full max-w-7xl flex-col gap-10 p-6'>
        <section
          aria-labelledby='download-platform-title'
          className='flex flex-col gap-4'
        >
          {/* <div id='download-platform-title' className='h4 m-0'>
            Explore our applications
          </div> */}
          <div className='overflow-hidden border border-border bg-card'>
            <div
              role='group'
              aria-label='Select an application'
              className='grid grid-cols-1 md:grid-cols-3'
            >
              {PLATFORMS.map((platform, index) => {
                const selected = activePlatform === platform.id
                const titleId = `download-${platform.id}-title`
                const summaryId = `download-${platform.id}-summary`
                const illustration = platform.illustration
                  .replace('<svg ', '<svg class="size-auto" ')
                  .replaceAll('stroke="#161616"', 'stroke="var(--foreground)"')
                return (
                  <div key={platform.id} className='relative min-w-0'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='lg'
                      nativeButton={false}
                      render={<div />}
                      aria-labelledby={titleId}
                      aria-describedby={summaryId}
                      aria-pressed={selected}
                      aria-controls='download-application-details'
                      onClick={() => setActivePlatform(platform.id)}
                      className={`relative isolate flex h-full min-h-44 w-full min-w-0 items-center justify-start gap-0 p-6 text-left whitespace-normal rounded-none ${
                        selected
                          ? 'bg-card dark:bg-card'
                          : 'bg-muted dark:bg-muted'
                      } ${
                        index < PLATFORMS.length - 1
                          ? 'md:border-r border-border'
                          : ''
                      } hover:bg-accent/50`}
                    >
                      <div className='flex min-w-0 items-center gap-4'>
                        <span
                          aria-hidden='true'
                          className='flex size-32 shrink-0 items-center justify-center overflow-hidden [&>svg]:block'
                          dangerouslySetInnerHTML={{ __html: illustration }}
                        />
                        <div className='flex min-w-0 flex-col gap-1'>
                          <h3
                            id={titleId}
                            className='h4 m-0 flex items-center gap-2 leading-7 lg:text-xl'
                          >
                            {platform.id === 'field' && (
                              <span
                                aria-hidden='true'
                                className='size-5 shrink-0 [&>svg]:block'
                                dangerouslySetInnerHTML={{
                                  __html: androidMark
                                }}
                              />
                            )}
                            {platform.cardTitle}
                          </h3>
                          <p
                            id={summaryId}
                            className='m-0 text-sm text-muted-foreground'
                          >
                            {platform.summary}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <>
                          <span
                            aria-hidden='true'
                            className='pointer-events-none absolute inset-0 z-2 h-1 bg-primary'
                          />
                          <span
                            aria-hidden='true'
                            className='pointer-events-none absolute right-6 left-6 bottom-0 z-2 h-px bg-border'
                          />
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
            <div id='download-application-details' className='bg-card p-6'>
              <PlatformDetails
                key={activePlatform}
                platformId={activePlatform}
                platformName={active.name}
                hostOs={hostOs}
                onHostOsChange={setHostOs}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
