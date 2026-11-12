import { useId, type ReactNode } from 'react'
import {
  CheckCircleIcon,
  CheckIcon,
  FileIcon,
  InfoIcon,
  ShieldCheckIcon,
  WarningIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { Alert, AlertDescription } from 'skytrack-ui/alert'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import type { InsightOutput } from './mission-insights-output-data'
import type {
  InsightIssue,
  MissionInsightSample
} from './mission-insights-data'
import { MissionInsightsOutputPreview } from './mission-insights-output-preview'
import { Separator } from 'skytrack-ui/separator'

export function DetailSection ({
  title,
  toolbar,
  children,
  className = ''
}: {
  title: string
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = useId()
  return (
    <section
      className={`flex min-w-0 flex-col gap-4 rounded-(--radius) border border-border bg-(--card) p-6 shadow-xs ${className}`}
      aria-labelledby={headingId}
    >
      <header className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
        <h2 id={headingId} className='h4 m-0'>
          {title}
        </h2>
        {toolbar ? (
          <div className='flex min-w-0 items-center gap-2'>{toolbar}</div>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function statusVariant (severity: InsightIssue['severity']) {
  if (severity === 'Error') return 'error'
  if (severity === 'Warning') return 'warning'
  return 'secondary'
}

export function MissionInsightsRunSummary ({
  sample,
  className = ''
}: {
  sample: MissionInsightSample
  className?: string
}) {
  let headline = sample.outcomeTitle
  let supportingText = ''
  let facts: ReadonlyArray<readonly [string, string]> = [
    ['Outcome details', sample.outcome],
    ['Run duration', sample.duration]
  ]

  if (
    !sample.demoCase &&
    sample.status === 'Succeeded' &&
    sample.outcomeTitle === 'Mission completed'
  ) {
    const [progress, ...details] = sample.outcome.split(' · ')
    headline = progress || sample.outcomeTitle
    facts = [
      ...(details.length > 0
        ? ([['Landing', details.join(' · ')]] as const)
        : []),
      ['Run duration', sample.duration]
    ]
  } else if (!sample.demoCase && sample.status === 'Failed') {
    const [statusHeadline, ...statusDetails] = sample.outcomeTitle.split(' · ')
    headline = statusHeadline || sample.outcomeTitle
    supportingText = statusDetails
      .join(' · ')
      .replace(/\s+at \d+(?:\.\d+)? s$/i, '')
    const [progress, ...details] = sample.outcome.split(' · ')
    facts = [
      ['Mission progress', progress || sample.outcome],
      ...(details.length > 0
        ? [['Flight end state', details.join(' · ')] as const]
        : []),
      ['Run duration', sample.duration]
    ]
  }

  const isFailed = sample.status === 'Failed'
  const isSucceeded = sample.status === 'Succeeded'
  const ResultIcon = isFailed ? WarningIcon : isSucceeded ? CheckIcon : InfoIcon
  const resultTone = isFailed
    ? 'text-destructive'
    : isSucceeded
    ? 'text-success'
    : 'text-muted-foreground'
  const factColumns =
    facts.length >= 3 ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'sm:grid-cols-2'

  return (
    <DetailSection title='Mission result' className={className}>
      <div className='flex min-w-0 items-center gap-4'>
        <span
          className={`grid size-14 shrink-0 place-items-center rounded-full border-1 ${resultTone}`}
        >
          <ResultIcon className='size-7' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <p className={`m-0 text-sm font-medium ${resultTone}`}>
            {sample.status}
          </p>
          <div className='flex flex-col items-baseline gap-1'>
            <div className='m-0 break-words h5'>{headline}</div>
            {supportingText ? (
              <p className='m-0 break-words text-muted-foreground'>
                {supportingText}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className='h-px w-full bg-border' />
      {facts.length > 0 ? (
        <dl
          className={`m-0 min-w-0 flex flex-[1_1_auto] gap-x-6 gap-y-4 ${factColumns}`}
        >
          {facts.map(([label, value]) => (
            <div key={label} className='min-w-0'>
              <dt className='text-sm text-muted-foreground'>{label}</dt>
              <dd className='m-0 mt-1 break-words font-medium'>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </DetailSection>
  )
}

export function MissionInsightsEvidenceSummary ({
  sample,
  className = ''
}: {
  sample: MissionInsightSample
  className?: string
}) {
  const CompletenessIcon =
    sample.evidenceCompleteness.state === 'complete'
      ? CheckCircleIcon
      : XCircleIcon
  const completenessIconClass =
    sample.evidenceCompleteness.state === 'complete'
      ? 'text-success'
      : 'text-muted-foreground'
  const integrityIconClass =
    sample.evidenceAvailability.integrityState === 'verified'
      ? 'text-success'
      : sample.evidenceAvailability.integrityState === 'issues'
        ? 'text-warning'
        : 'text-muted-foreground'
  const filesIconClass =
    sample.evidenceAvailability.state === 'available'
      ? 'text-success'
      : sample.evidenceAvailability.state === 'partial'
        ? 'text-warning'
        : 'text-muted-foreground'

  return (
    <DetailSection title='Evidence' className={className}>
      <dl className='m-0 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2'>
        <div className='min-w-0'>
          <dt className='text-muted-foreground'>Completeness</dt>
          <dd className='m-0 mt-1 flex min-w-0 items-start gap-2'>
            <CompletenessIcon
              className={`mt-0.5 size-4 shrink-0 ${completenessIconClass}`}
              weight='fill'
              aria-hidden='true'
            />
            <div className='min-w-0 break-words'>
              <p className='m-0'>{sample.evidenceCompleteness.summary}</p>
              {sample.evidenceCompleteness.detail ? (
                <p className='m-0 mt-1 text-muted-foreground'>
                  {sample.evidenceCompleteness.detail}
                </p>
              ) : null}
            </div>
          </dd>
        </div>
        <div className='min-w-0'>
          <dt className='text-muted-foreground'>Availability</dt>
          <dd className='m-0 mt-1 flex min-w-0 flex-col gap-2'>
            <div className='flex min-w-0 items-start gap-2'>
              <FileIcon
                className={`mt-0.5 size-4 shrink-0 ${filesIconClass}`}
                aria-hidden='true'
              />
              <span className='min-w-0 break-words'>
                {sample.evidenceAvailability.files}
              </span>
            </div>
            <div className='flex min-w-0 items-start gap-2'>
              <ShieldCheckIcon
                className={`mt-0.5 size-4 shrink-0 ${integrityIconClass}`}
                aria-hidden='true'
              />
              <span className='min-w-0 break-words'>
                {sample.evidenceAvailability.integrity}
              </span>
            </div>
          </dd>
        </div>
      </dl>
    </DetailSection>
  )
}

export function MissionInsightsOutputs ({
  sample,
  onOpen,
  onOpenSurveyImages
}: {
  sample: MissionInsightSample
  onOpen: (output: InsightOutput) => void
  onOpenSurveyImages: () => void
}) {
  return (
    <DetailSection title='Outputs'>
      <div className='grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2'>
        {sample.outputs.length === 0 ? (
          <Alert className='col-span-full'>
            <AlertDescription>
              {sample.demoCase
                ? 'No outputs were produced before the run stopped.'
                : 'No outputs are available for this run.'}
            </AlertDescription>
          </Alert>
        ) : null}
        {sample.outputs.map(output => (
          <section
            key={output.id}
            className='flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border bg-(--background) p-4'
            aria-labelledby={`ms-output-card-${output.id}`}
          >
            <header className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
              <h3
                id={`ms-output-card-${output.id}`}
                className='m-0 text-lg font-medium text-foreground'
              >
                {output.name}
              </h3>
              <Badge
                className='rounded-(--radius)'
                count={output.status}
                status={output.status === 'Available' ? 'success' : 'warning'}
              />
            </header>
            {output.preview ? (
              <MissionInsightsOutputPreview
                preview={output.preview}
                onOpenSurveyImages={
                  output.id === 'survey-image-set'
                    ? onOpenSurveyImages
                    : undefined
                }
              />
            ) : null}
            <p className='m-0 text-muted-foreground'>{output.summary}</p>
            <Button
              variant='outline'
              size='sm'
              className='self-start'
              onClick={() => onOpen(output)}
            >
              Open details
            </Button>
          </section>
        ))}
      </div>
    </DetailSection>
  )
}

export function MissionInsightsTopIssues ({
  sample,
  onViewIssue,
  className = ''
}: {
  sample: MissionInsightSample
  onViewIssue: (issueCode: string) => void
  className?: string
}) {
  const summaryBadges = sample.issuesSummary
    .split(' · ')
    .filter(summary => !summary.toLowerCase().startsWith('top '))

  return (
    <DetailSection
      title='Needs attention'
      className={className}
      toolbar={
        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          {summaryBadges.map(summary => (
            <Badge
              key={summary}
              className='rounded-(--radius)'
              count={summary}
              status={
                /error|mismatch/i.test(summary)
                  ? 'error'
                  : /warning|gap|missing/i.test(summary)
                  ? 'warning'
                  : 'secondary'
              }
            />
          ))}
          {sample.issueTotal > 3 && sample.issues[0] ? (
            <>
              <Separator
                orientation='vertical'
                className='mx-1.5 h-auto self-stretch'
              />
              <Button
                variant='link'
                size='sm'
                className='h-auto px-0'
                onClick={() => onViewIssue(sample.issues[0].code)}
              >
                View all
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      {sample.issues.length ? (
        <ul className='m-0 flex list-none flex-col gap-3 p-0'>
          {sample.issues.map(issue => (
            <li
              key={issue.code}
              className='flex min-w-0 flex-col gap-2 border-b first:border-t border-border py-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start'
            >
              <div className='w-20 self-start'>
                <Badge
                  count={issue.severity}
                  status={statusVariant(issue.severity)}
                />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='m-0 font-medium'>
                  <code>{issue.code}</code>
                </p>
                <p className='m-0 mt-1 mb-2 break-words text-muted-foreground'>
                  {issue.message}
                </p>
                <span className='tabular-nums text-muted-foreground'>
                  {issue.time === null
                    ? 'Time unknown'
                    : `${issue.time.toFixed(1)} s`}
                </span>
              </div>
              <div className='flex shrink-0 min-h-0 h-full flex-wrap items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  title={`Open ${issue.code} in Timeline`}
                  onClick={() => {
                    onViewIssue(issue.code)
                  }}
                >
                  View
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className='m-0 text-muted-foreground'>No issues are recorded.</p>
      )}
    </DetailSection>
  )
}
