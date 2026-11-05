import { CpuIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
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
    summary: 'Android ground-station application for field use.'
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

const DESKTOP_HOSTS = ['macOS', 'Ubuntu', 'Windows'] as const

const DESKTOP_SYSTEM_REQUIREMENTS: Record<
  (typeof DESKTOP_HOSTS)[number],
  { label: string, value: string }[]
> = {
  macOS: [
    { label: 'Operating System', value: 'macOS 11 (Big Sur) or newer' },
    { label: 'CPU', value: 'Intel Core i5 / Apple Silicon (M1/M2)' },
    { label: 'GPU', value: 'Metal-supported GPU (integrated or discrete)' },
    { label: 'RAM', value: '16 GB' },
    { label: 'Hard Disk', value: '25 GB free' }
  ],
  Ubuntu: [
    { label: 'Operating System', value: 'Ubuntu 20.04 (Focal) or 22.04 (Jammy)' },
    { label: 'CPU', value: 'Intel Core i5 or equivalent' },
    { label: 'GPU', value: 'NVIDIA GTX 1080 or better' },
    { label: 'RAM', value: '16 GB' },
    { label: 'Hard Disk', value: '25 GB free' }
  ],
  Windows: [
    { label: 'Operating System', value: 'Windows 10 or 11' },
    { label: 'CPU', value: 'Intel Core i5 (quad-core)' },
    { label: 'GPU', value: 'NVIDIA GTX 1080 (OGRE2 rendering supported)' },
    { label: 'RAM', value: '16 GB' },
    { label: 'Hard Disk', value: '25 GB free' }
  ]
}

const ANDROID_SYSTEM_REQUIREMENTS = [
  {
    component: 'Operating system',
    minimum: 'Android 11',
    recommended: 'Android 13 or later'
  },
  {
    component: 'Processor',
    minimum: '64-bit ARM',
    recommended: 'Mid-range or higher 64-bit ARM processor'
  },
  { component: 'RAM', minimum: '4 GB', recommended: '8 GB or more' },
  {
    component: 'Graphics',
    minimum: 'OpenGL ES 3.0',
    recommended: 'OpenGL ES 3.1 or later'
  },
  {
    component: 'Available storage',
    minimum: '1 GB',
    recommended: '2 GB or more'
  },
  {
    component: 'Connectivity',
    minimum: 'Wi-Fi',
    recommended: 'Dual-band Wi-Fi; 4G/5G for cellular routing'
  },
  {
    component: 'USB Host / OTG',
    minimum: 'Required when using a USB Wi-Fi adapter',
    recommended: 'USB-C OTG with a stable power supply'
  },
  {
    component: 'Video decoding',
    minimum: "Hardware decoding for the camera's codec",
    recommended: 'Hardware H.264/H.265 decoding supporting 1080p at 60 fps'
  }
] as const

const HOST_OPTIONS = [
  {
    label: 'macOS',
    detail: 'Host option listed in the guide',
    logo: macOsMark
  },
  {
    label: 'Ubuntu',
    detail: 'Host option listed in the guide',
    logo: ubuntuMark
  },
  {
    label: 'Windows',
    detail: 'Host option listed in the guide',
    logo: windowsMark
  }
] as const

const SKYTRACK_OS_TARGETS = [
  {
    id: 'jetson',
    label: 'NVIDIA Jetson',
    detail: 'Nano / Xavier / Orin NX'
  },
  {
    id: 'raspberry-pi',
    label: 'Raspberry Pi / Compute Module',
    detail: 'Common architecture hardware'
  },
  {
    id: 'linux-sbc',
    label: 'Linux SBC',
    detail: 'Common architecture hardware'
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
  const [skyTrackOsTarget, setSkyTrackOsTarget] = useState<string>(
    SKYTRACK_OS_TARGETS[0].id
  )
  const selectedSkyTrackOsTarget = SKYTRACK_OS_TARGETS.find(
    target => target.id === skyTrackOsTarget
  )!

  const compatibility =
    platformId === 'desktop'
      ? `The ${hostOs} host and hardware requirements are listed above. The Getting Started guide also lists an internet connection, permission to install Docker Desktop, and a SkyTrack account using a supported provider.`
      : platformId === 'field'
      ? 'The table shows the proposed minimum and recommended Android device requirements.'
      : `${selectedSkyTrackOsTarget.label} is listed as common architecture hardware. This example does not certify target compatibility or an OS image. The optional HITL profile is a separate, specific bench scenario.`

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

  const systemRequirements = DESKTOP_SYSTEM_REQUIREMENTS[hostOs]

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
            : platformId === 'os'
            ? ['select-target', 'requirements', 'setup']
            : ['requirements', 'setup']
        }
        className='w-full'
      >
        {(platformId === 'desktop' || platformId === 'os') && (
          <AccordionItem
            value={platformId === 'desktop' ? 'select-os' : 'select-target'}
          >
            <AccordionTrigger className='text-lg font-semibold'>
              {platformId === 'desktop' ? 'Select OS' : 'Select target'}
            </AccordionTrigger>
            <AccordionContent>
              <div
                role='group'
                aria-label={
                  platformId === 'desktop'
                    ? 'Select a Desktop host operating system'
                    : 'Select a SkyTrack OS target hardware family'
                }
                className='grid grid-cols-1 gap-3 pb-4 md:grid-cols-3'
              >
              {platformId === 'desktop' &&
                HOST_OPTIONS.map(({ label, detail, logo }) => (
                  <Button
                    key={label}
                    type='button'
                    variant='outline'
                    aria-pressed={hostOs === label}
                    onClick={() => onHostOsChange(label)}
                    className={`h-auto w-full justify-start gap-3 rounded-(--radius) border-border py-3 ${
                      hostOs === label ? 'border-primary text-primary' : ''
                    }`}
                  >
                    <span
                      aria-hidden='true'
                      className='size-8 shrink-0 [&>svg]:block'
                      dangerouslySetInnerHTML={{ __html: logo }}
                    />
                    <span className='flex min-w-0 flex-col items-start gap-1 text-left'>
                      <span className='text-base font-semibold'>{label}</span>
                      <span className='text-sm font-normal text-muted-foreground'>
                        {detail}
                      </span>
                    </span>
                  </Button>
                ))}
              {platformId === 'os' &&
                SKYTRACK_OS_TARGETS.map(target => (
                  <Button
                    key={target.id}
                    type='button'
                    variant='outline'
                    aria-pressed={skyTrackOsTarget === target.id}
                    onClick={() => setSkyTrackOsTarget(target.id)}
                    className={`h-auto w-full justify-start gap-3 rounded-(--radius) border-border py-3 ${
                      skyTrackOsTarget === target.id
                        ? 'border-primary text-primary'
                        : ''
                    }`}
                  >
                    <CpuIcon
                      aria-hidden='true'
                      className='size-8 shrink-0'
                      weight='regular'
                    />
                    <span className='flex min-w-0 flex-col items-start gap-1 text-left'>
                      <span className='text-base font-semibold'>
                        {target.label}
                      </span>
                      <span className='text-sm font-normal text-muted-foreground'>
                        {target.detail}
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
              ? 'Proposed system requirements'
              : platformId === 'field'
              ? 'Proposed Android system requirements'
              : 'Compatibility'}
          </AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-4 pb-4'>
              {(platformId === 'desktop' || platformId === 'field') && (
                <p className='m-0 text-sm text-muted-foreground'>
                  These values are unverified planning proposals, not confirmed
                  minimum requirements or certified compatibility. Android
                  support and distribution are not confirmed.
                </p>
              )}
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
              {platformId === 'field' && (
                <div className='overflow-x-auto pb-4'>
                  <table className='w-full min-w-[720px] border-collapse text-left'>
                    <caption className='sr-only'>
                      Android device requirements: proposed minimum and recommended
                      specifications
                    </caption>
                    <thead>
                      <tr className='border-b border-border'>
                        <th
                          scope='col'
                          className='px-3 py-3 text-base font-semibold text-foreground'
                        >
                          Component
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3 text-base font-semibold text-foreground'
                        >
                          Proposed minimum
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3 text-base font-semibold text-foreground'
                        >
                          Proposed recommended
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ANDROID_SYSTEM_REQUIREMENTS.map(
                        ({ component, minimum, recommended }) => (
                          <tr key={component} className='border-b border-border'>
                            <th
                              scope='row'
                              className='px-3 py-3 text-left text-base font-medium text-foreground'
                            >
                              {component}
                            </th>
                            <td className='px-3 py-3 align-top text-base text-foreground'>
                              {minimum}
                            </td>
                            <td className='px-3 py-3 align-top text-base text-foreground'>
                              {recommended}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <p className='text-base text-muted-foreground'>{compatibility}</p>
              {platformId !== 'os' && (
                <Button type='button' disabled className='self-start'>
                  <DownloadSimpleIcon aria-hidden='true' />
                  {platformId === 'field' ? 'Download Android app' : 'Download'}
                </Button>
              )}
              {platformId === 'os' && (
                <Button type='button' disabled className='self-start'>
                  <DownloadSimpleIcon aria-hidden='true' />
                  Download SkyTrack OS
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

export default function DownloadPage () {
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
                            className='text-sm text-muted-foreground font-normal'
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
