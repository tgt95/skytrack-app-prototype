import { type MissionInsightSample } from './mission-insights-data'
import {
  DetailSection,
  MissionInsightsRunSummary,
  MissionInsightsTopIssues
} from './mission-insights-page-sections'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from 'skytrack-ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { MissionInsightsFlightReplay } from './mission-insights-flight-replay'
import { MissionInsightsOverviewOutputsFiles } from './mission-insights-overview-outputs-files'

export function OverviewTab ({
  sample,
  onOpenMedia,
  onOpenMediaFiles,
  onOpenIssue,
  onSeek,
  replayTime,
  seekNotice
}: {
  sample: MissionInsightSample
  onOpenMedia: (id: string) => void
  onOpenMediaFiles: () => void
  onOpenIssue: (issueCode: string) => void
  onSeek: (time: number | null, label?: string) => void
  replayTime: number
  seekNotice: string
}) {
  return (
    <div className='grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12'>
      <div className='flex min-w-0 flex-col overflow-hidden rounded-(--radius) border border-border bg-(--card) shadow-xs xl:col-span-8'>
        <MissionInsightsRunSummary
          sample={sample}
          className='rounded-none !border-0 !shadow-none'
        />
        <MissionInsightsTopIssues
          sample={sample}
          onViewIssue={onOpenIssue}
          className='mt-auto rounded-none border-0 border-t border-border shadow-none'
        />
      </div>
      <MissionInsightsOverviewOutputsFiles
        sample={sample}
        onOpenMedia={onOpenMedia}
        onOpenMediaFiles={onOpenMediaFiles}
        className='xl:col-span-4'
      />
      <DetailSection
        title='Run distributions'
        className='xl:col-span-12'
      >
        <div className='grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-0'>
          <div className='xl:pr-6'>
            <CategoryChart
              title='Actions by status'
              rows={sample.actions}
              unit='Actions'
            />
          </div>
          <div className='xl:border-l xl:border-border xl:pl-6'>
            <CategoryChart
              title='Files by type'
              rows={sample.files}
              unit='Files'
            />
          </div>
        </div>
      </DetailSection>
      <div className='flex flex-col gap-6 xl:col-span-12'>
        <DetailSection title='Flight replay'>
          <MissionInsightsFlightReplay
            sample={sample}
            time={replayTime}
            seekNotice={seekNotice}
            onSeek={(time, label) => onSeek(time, label)}
          />
        </DetailSection>
      </div>
    </div>
  )
}

export function CategoryChart ({
  title,
  rows,
  unit,
  compact = false
}: {
  title: string
  rows: ReadonlyArray<readonly [string, number]>
  unit: string
  compact?: boolean
}) {
  const data = rows.map(([name, count]) => ({ name, count }))
  const config: ChartConfig = {
    count: { label: unit, color: 'var(--chart-1)' }
  }
  const palette = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)'
  ]

  return (
    <section className={`flex min-w-0 flex-col ${compact ? 'gap-2' : 'gap-3'}`} aria-label={title}>
      <h3 className={`m-0 font-medium text-foreground ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
      {data.length ? (
        <div className='grid min-w-0 grid-cols-1 items-center gap-4 md:grid-cols-2'>
          <ChartContainer
            className={`${compact ? 'h-32' : 'h-60'} min-w-0 w-full`}
            config={config}
            aria-label={`${title}; exact values are listed in the legend`}
          >
            <PieChart accessibilityLayer>
              <Pie
                data={data}
                dataKey='count'
                nameKey='name'
                innerRadius={compact ? 28 : 48}
                outerRadius={compact ? 48 : 76}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {data.map((row, index) => (
                  <Cell key={row.name} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent className='rounded-(--radius)' />}
              />
            </PieChart>
          </ChartContainer>
          <ul className={`m-0 flex min-w-0 list-none flex-col p-0 ${compact ? 'gap-1 text-sm' : 'gap-2'}`}>
            {rows.map(([name, count], index) => (
              <li key={name} className='flex min-w-0 items-center gap-2'>
                <span
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: palette[index % palette.length] }}
                  aria-hidden='true'
                />
                <span className='min-w-0 flex-1'>{name}</span>
                <span className='shrink-0 tabular-nums'>
                  {count} {unit.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className='m-0 text-muted-foreground'>
          No {unit.toLowerCase()} values recorded.
        </p>
      )}
    </section>
  )
}
