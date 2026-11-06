import {
  CheckIcon,
  CodeIcon,
  CopySimpleIcon,
  DownloadSimpleIcon,
  GooglePlayLogoIcon
} from '@phosphor-icons/react'
import { useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from 'skytrack-ui/accordion'
import { Badge } from 'skytrack-ui/badge'
import { Button, buttonVariants } from 'skytrack-ui/button'
import { PageHeader } from 'skytrack-ui/page-header'
import downloadContent from '@content/download/platforms.json'
import desktopArt from '@/assets/download/desktop.svg?raw'
import mobileArt from '@/assets/download/mobile.svg?raw'
import skytrackOsArt from '@/assets/download/skytrack-os.svg?raw'
import androidLogo from '@/assets/download/android.svg?raw'
import linuxLogo from '@/assets/download/Linux_Logo_in_Linux_Libertine_Font-outline.svg?raw'
import nvidiaLogo from '@/assets/download/nvidia_logo-outline.svg?raw'
import raspberryPiLogo from '@/assets/download/raspberry_pi-outline.svg?raw'
import ubuntuLogo from '@/assets/download/ubuntu.svg?raw'
import windowsLogo from '@/assets/download/windows.svg?raw'
import macOsLogo from '@/assets/download/mac-os.svg?raw'
import { runEnvironmentToastManager } from '@/features/library/library-topbar'

const inlineLogo = (svg: string) =>
  svg
    .replace('<svg ', '<svg class="size-full" ')
    .replaceAll('fill="#161616"', 'fill="currentColor"')
    .replaceAll('fill="black"', 'fill="currentColor"')

const androidMark = inlineLogo(androidLogo)
const linuxMark = inlineLogo(linuxLogo)
const nvidiaMark = inlineLogo(nvidiaLogo)
const raspberryPiMark = inlineLogo(raspberryPiLogo)
const ubuntuMark = inlineLogo(ubuntuLogo)
const windowsMark = inlineLogo(windowsLogo)
const macOsMark = inlineLogo(macOsLogo)
const ILLUSTRATIONS = {
  desktop: desktopArt,
  mobile: mobileArt,
  'skytrack-os': skytrackOsArt
} as const

const PLATFORM_LOGOS = {
  android: androidMark,
  linux: linuxMark,
  nvidia: nvidiaMark,
  raspberryPi: raspberryPiMark,
  ubuntu: ubuntuMark,
  windows: windowsMark,
  macOS: macOsMark
} as const

const PLATFORMS = downloadContent.platforms.map(platform => ({
  ...platform,
  illustration: ILLUSTRATIONS[platform.illustration as keyof typeof ILLUSTRATIONS]
}))

const HOST_OPTIONS = downloadContent.desktop.hosts.map(host => ({
  ...host,
  logo: PLATFORM_LOGOS[host.logo as keyof typeof PLATFORM_LOGOS]
}))

type DesktopHost = (typeof HOST_OPTIONS)[number]['label']

const DESKTOP_HOSTS = HOST_OPTIONS.map(host => host.label) as DesktopHost[]
const DOCKER_DESKTOP_INSTALL_GUIDES = downloadContent.desktop.dockerInstallGuides as Record<DesktopHost, string>
const DESKTOP_SYSTEM_REQUIREMENTS = downloadContent.desktop.systemRequirements as Record<
  DesktopHost,
  { label: string; value: string }[]
>
const ANDROID_SYSTEM_REQUIREMENTS = downloadContent.android.requirements
const ANDROID_SETUP_STEPS = downloadContent.android.setupSteps
const DESKTOP_SETUP = downloadContent.desktop.setup
const SKYTRACK_OS_TARGETS = downloadContent.skyTrackOs.targets.map(target => ({
  ...target,
  logo: PLATFORM_LOGOS[target.logo as keyof typeof PLATFORM_LOGOS],
  downloadImages: target.downloads
}))
const SKYTRACK_OS_COMPATIBILITY = downloadContent.skyTrackOs.compatibilityTemplate
const JETSON_FLASH_GUIDES = import.meta.glob<string>(
  '@content/download/setup/jetson-orin-nano.md',
  { query: '?raw', import: 'default', eager: true }
)
const JETSON_FLASH_GUIDE = Object.values(JETSON_FLASH_GUIDES)[0] ?? ''

function CopyableCodeBlock ({
  code,
  description
}: {
  code: string
  description: string
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  )

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className='overflow-hidden rounded-(--radius) border border-border bg-muted'>
      <div className='flex items-center justify-between border-b border-border px-3 py-1'>
        <span className='flex items-center gap-2 text-sm text-muted-foreground'>
          <CodeIcon aria-hidden='true' className='size-4' />
          Plain Text
        </span>
        <span className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={
              copyState === 'copied'
                ? `Copied ${description}`
                : copyState === 'failed'
                ? `Could not copy ${description}`
                : `Copy ${description}`
            }
            onClick={copyCode}
          >
            {copyState === 'copied' ? (
              <CheckIcon aria-hidden='true' />
            ) : (
              <CopySimpleIcon aria-hidden='true' />
            )}
          </Button>
          {copyState !== 'idle' && (
            <span className='text-xs text-muted-foreground'>
              {copyState === 'copied' ? 'Copied' : 'Copy failed'}
            </span>
          )}
        </span>
        <span className='sr-only' aria-live='polite'>
          {copyState === 'copied'
            ? `${description} copied to clipboard.`
            : copyState === 'failed'
            ? `Could not copy ${description}.`
            : ''}
        </span>
      </div>
      <pre className='m-0 overflow-x-auto px-4 py-3 text-sm leading-6 text-foreground'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

const setupMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h4 className='m-0 text-base font-semibold text-foreground'>{children}</h4>
  ),
  h2: ({ children }) => (
    <div className='m-0 text-base font-semibold text-foreground'>{children}</div>
  ),
  p: ({ children }) => (
    <p className='m-0 text-muted-foreground'>{children}</p>
  ),
  ol: ({ children }) => (
    <ol className='m-0 flex list-[lower-roman] flex-col gap-1 pl-6 text-muted-foreground'>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className='text-base'>{children}</li>,
  code: ({ children, className }) =>
    className ? (
      <CopyableCodeBlock
        description='setup guide code block'
        code={String(children).replace(/\n$/, '')}
      />
    ) : (
      <code className='rounded-(--radius) border border-border p-1 font-mono text-sm text-foreground'>
        {children}
      </code>
    ),
  pre: ({ children }) => <>{children}</>
}

function JetsonFlashGuideline () {
  return (
    <div className='flex flex-col gap-4 text-base'>
      <ReactMarkdown components={setupMarkdownComponents}>
        {JETSON_FLASH_GUIDE}
      </ReactMarkdown>
    </div>
  )
}

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
      ? null
      : // ? `The ${hostOs} host and hardware requirements are listed above. The Getting Started guide also lists an internet connection, permission to install Docker Desktop, and a SkyTrack account using a supported provider.`
      platformId === 'field'
      ? // ? "The table shows the proposed minimum and recommended Android device requirements."
        null
      : SKYTRACK_OS_COMPATIBILITY.replace(
          '{target}',
          selectedSkyTrackOsTarget.label
        )

  const setupSteps = ANDROID_SETUP_STEPS

  const systemRequirements = DESKTOP_SYSTEM_REQUIREMENTS[hostOs]
  const downloadLabel =
    platformId === 'desktop'
      ? HOST_OPTIONS.find(option => option.label === hostOs)!.downloadLabel
      : ''

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
            : ['android-platform', 'requirements', 'setup']
        }
        className='w-full'
      >
        <AccordionItem
          value={
            platformId === 'desktop'
              ? 'select-os'
              : platformId === 'field'
              ? 'android-platform'
              : 'select-target'
          }
        >
          <AccordionTrigger className='text-lg font-semibold'>
            {platformId === 'desktop'
              ? 'Select OS'
              : platformId === 'field'
              ? 'Select platform'
              : 'Select hardware'}
          </AccordionTrigger>
          <AccordionContent>
            <div
              role='group'
              aria-label={
                platformId === 'desktop'
                  ? 'Select a Desktop host operating system'
                  : platformId === 'field'
                  ? 'Select platform'
                  : 'Select hardware'
              }
              className='grid grid-cols-1 gap-3 pb-4 md:grid-cols-3'
            >
              {platformId === 'desktop' &&
                HOST_OPTIONS.map(({ label, version, detail, logo }) => (
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
                    <span className='flex min-w-0 flex-col items-start gap-0.5 text-left'>
                      <span className='flex items-center gap-2 text-base font-semibold'>
                        {label}
                        <Badge variant='outline' className='normal-case'>
                          {version}
                        </Badge>
                      </span>
                      <span className='text-sm font-normal text-muted-foreground'>
                        {detail}
                      </span>
                    </span>
                  </Button>
                ))}
              {platformId === 'field' && (
                <div
                  role='group'
                  aria-label='Android, the only available Mobile platform'
                  className='flex h-auto w-full items-center gap-3 rounded-(--radius) border border-primary bg-card px-3 py-3 text-primary'
                >
                  <span
                    aria-hidden='true'
                    className='size-8 shrink-0 [&>svg]:block'
                    dangerouslySetInnerHTML={{ __html: androidMark }}
                  />
                  <span className='flex min-w-0 flex-col items-start gap-0.5 text-left'>
                    <span className='flex items-center gap-2 text-base font-semibold'>
                      Android
                        <Badge variant='outline' className='normal-case'>
                        {downloadContent.android.version}
                      </Badge>
                    </span>
                    <span className='text-sm font-normal text-muted-foreground'>
                      {downloadContent.android.detail}
                    </span>
                  </span>
                </div>
              )}
              {platformId === 'os' &&
                SKYTRACK_OS_TARGETS.map(target => (
                  <Button
                    key={target.id}
                    type='button'
                    variant='outline'
                    disabled={target.disabled}
                    aria-pressed={skyTrackOsTarget === target.id}
                    onClick={() => setSkyTrackOsTarget(target.id)}
                    className={`h-auto w-full justify-start gap-3 rounded-(--radius) border-border py-3 ${
                      skyTrackOsTarget === target.id
                        ? 'border-primary text-primary'
                        : ''
                    }`}
                  >
                    <span
                      aria-hidden='true'
                      className='size-8 shrink-0 [&>svg]:block'
                      dangerouslySetInnerHTML={{ __html: target.logo }}
                    />
                    <span className='flex min-w-0 flex-col items-start gap-0.5 text-left'>
                      <span className='flex items-center gap-2 text-base font-semibold'>
                        {target.label}
                        <Badge variant='outline' className='normal-case'>
                          {target.badgeLabel}
                        </Badge>
                      </span>
                      <span className='text-sm font-normal text-muted-foreground'>
                        {target.detail}
                      </span>
                    </span>
                  </Button>
                ))}
              {platformId === 'field' ? (
                <a
                  href={downloadContent.android.storeUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Get SkyTrack Field on Google Play'
                  className={`${buttonVariants()} justify-self-start md:col-span-3`}
                >
                  <GooglePlayLogoIcon
                    aria-hidden='true'
                    className='size-5'
                    weight='fill'
                  />
                  {downloadContent.android.storeButtonLabel}
                </a>
              ) : platformId === 'os' ? (
                <div className='flex w-full flex-col gap-2'>
                  <div className='flex flex-row gap-3'>
                    {selectedSkyTrackOsTarget.downloadImages.map(image => (
                      <Button
                        key={image.filename}
                        aria-label={`${image.label}: ${image.downloadLabel}; ${image.filename}; demo package has no installer attached`}
                        onClick={() =>
                          runEnvironmentToastManager.add({
                            title:
                              'Demo package only — no installer file attached'
                          })
                        }
                      >
                        <DownloadSimpleIcon aria-hidden='true' />
                        {image.downloadLabel}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='flex flex-col gap-2 justify-self-start md:col-span-3'>
                  <Button
                    type='button'
                    aria-label={`${hostOs} ${downloadLabel}; demo package has no installer attached`}
                    onClick={() =>
                      runEnvironmentToastManager.add({
                        title: 'Demo package only — no installer file attached'
                      })
                    }
                    className='h-auto py-2'
                  >
                    <DownloadSimpleIcon aria-hidden='true' />
                    {downloadLabel}
                  </Button>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='requirements'>
          <AccordionTrigger className='text-lg font-semibold'>
            {platformId === 'desktop'
              ? 'System requirements'
              : platformId === 'field'
              ? 'Android system requirements'
              : 'Compatibility'}
          </AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-4 pb-4'>
              {platformId === 'desktop' && (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[40rem] table-fixed border-collapse text-left'>
                    <caption className='sr-only'>
                      Desktop system requirements for {hostOs}
                    </caption>
                    <colgroup>
                      <col className='w-[30%]' />
                      <col className='w-[70%]' />
                    </colgroup>
                    <thead>
                      <tr className='border-b border-border'>
                        <th
                          scope='col'
                          className='px-3 py-3 pl-0 text-base font-semibold text-foreground'
                        >
                          Component
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3 text-base font-semibold text-foreground'
                        >
                          Requirement
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemRequirements.map(({ label, value }) => (
                        <tr
                          key={label}
                          className='border-b border-border last:border-b-0'
                        >
                          <th
                            scope='row'
                            className='px-3 py-3 pl-0 text-left text-base font-medium text-foreground'
                          >
                            {label}
                          </th>
                          <td className='px-3 py-3 align-top text-base text-foreground'>
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {platformId === 'field' && (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[56rem] table-fixed border-collapse text-left'>
                    <caption className='sr-only'>
                      Android device requirements: proposed minimum and
                      recommended specifications
                    </caption>
                    <colgroup>
                      <col className='w-[20%]' />
                      <col className='w-[35%]' />
                      <col className='w-[45%]' />
                    </colgroup>
                    <thead>
                      <tr className='border-b border-border'>
                        <th
                          scope='col'
                          className='px-3 py-3 pl-0 text-base font-semibold text-foreground'
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
                          Recommended
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ANDROID_SYSTEM_REQUIREMENTS.map(
                        ({ component, minimum, recommended }) => (
                          <tr
                            key={component}
                            className='border-b border-border last:border-b-0'
                          >
                            <th
                              scope='row'
                              className='px-3 py-3 pl-0 text-left text-base font-medium text-foreground'
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
              {compatibility && (
                <p className='text-base text-muted-foreground'>
                  {compatibility}
                </p>
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
                      {DESKTOP_SETUP.heading}
                    </div>
                  </div>
                  <div className='grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 text-base'>
                    <article className='flex min-w-0 flex-col gap-4 border border-border p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='text-lg font-medium'>
                          {DESKTOP_SETUP.localTitle}
                        </div>
                        <Badge variant='outline'>{DESKTOP_SETUP.localBadge}</Badge>
                      </div>
                      <ol className='m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground'>
                        {DESKTOP_SETUP.localSteps.map(step => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <div className='mt-auto flex flex-col gap-2'>
                        <div className='text-lg font-medium text-foreground'>
                          {DESKTOP_SETUP.readyTitle}
                        </div>
                        <p className='m-0 text-muted-foreground'>
                          {DESKTOP_SETUP.readyDescription}
                        </p>
                        <a
                          href={DOCKER_DESKTOP_INSTALL_GUIDES[hostOs]}
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label={`Open Docker Desktop installation instructions for ${hostOs}`}
                          className={`${buttonVariants()} self-start`}
                        >
                          <DownloadSimpleIcon aria-hidden='true' />
                          {DESKTOP_SETUP.dockerDownloadLabel}
                        </a>
                      </div>
                    </article>
                    <span className='self-center text-center text-muted-foreground'>
                      or
                    </span>
                    <article className='flex min-w-0 flex-col gap-4 border border-border p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='text-lg font-medium'>
                          {DESKTOP_SETUP.cloudTitle}
                        </div>
                        <Badge variant='outline'>{DESKTOP_SETUP.cloudBadge}</Badge>
                      </div>
                      <p className='m-0 text-muted-foreground'>
                        {DESKTOP_SETUP.cloudDescription}
                      </p>
                      {/* <Button
                        type='button'
                        variant='outline'
                        className='mt-auto self-start'
                      >
                        Select Cloud
                      </Button> */}
                    </article>
                  </div>
                  <ol className='m-0 flex list-none flex-col gap-3 p-0 text-muted-foreground'>
                    <li className='flex items-center gap-3'>
                      <Badge variant='outline' className='rounded-none'>
                        2
                      </Badge>
                      <span className='text-lg font-medium text-foreground'>
                        {DESKTOP_SETUP.pendingSteps[0]}
                      </span>
                    </li>
                    <li className='flex items-center gap-3'>
                      <Badge variant='outline' className='rounded-none'>
                        3
                      </Badge>
                      <span className='text-lg font-medium text-foreground'>
                        {DESKTOP_SETUP.pendingSteps[1]}
                      </span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  {platformId === 'os' ? (
                    <JetsonFlashGuideline />
                  ) : (
                    <>
                      <ol className='m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground'>
                        {setupSteps.map(step => (
                          <li key={step} className='text-base text-foreground'>
                            {step}
                          </li>
                        ))}
                      </ol>
                      {/* <Button type='button' disabled className='self-start'>
                        Open setup guide
                      </Button> */}
                    </>
                  )}
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
                          {/* <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-6 left-6 bottom-0 z-2 h-px bg-border"
                          /> */}
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
