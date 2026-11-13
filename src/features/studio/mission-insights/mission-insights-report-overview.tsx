import { type MissionInsightSample } from './mission-insights-data'
import { type InsightOutput } from './mission-insights-output-data'
import {
  DetailSection,
  MissionInsightsEvidenceSummary,
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
import { MissionInsightsOverviewMedia } from './mission-insights-overview-media'

export function OverviewTab ({
  sample,
  onOpenOutput,
  onOpenMedia,
  onOpenIssue,
  onSeek,
  replayTime,
  seekNotice
}: {
  sample: MissionInsightSample
  onOpenOutput: (output: InsightOutput) => void
  onOpenMedia: (id: string) => void
  onOpenIssue: (issueCode: string) => void
  onSeek: (time: number | null, label?: string) => void
  replayTime: number
  seekNotice: string
}) {
  return (
    <div className='grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12'>
      <div className='grid min-w-0 grid-cols-1 gap-6 xl:col-span-12 xl:grid-cols-12'>
        <div className='flex min-w-0 flex-col overflow-hidden rounded-(--radius) border border-border bg-(--card) shadow-xs xl:col-span-8'>
          <MissionInsightsRunSummary
            sample={sample}
            className='rounded-none border-0 shadow-none'
          />
          <MissionInsightsTopIssues
            sample={sample}
            onViewIssue={onOpenIssue}
            className='mt-auto rounded-none border-0 border-t border-border shadow-none'
          />
        </div>
        <MissionInsightsEvidenceSummary
          sample={sample}
          onOpenOutput={onOpenOutput}
          onOpenMedia={onOpenMedia}
          className='xl:col-span-4'
        />
      </div>
      <div className='flex flex-col gap-6 xl:col-span-12 3xl:col-span-8'>
        <DetailSection title='Flight replay'>
          <MissionInsightsFlightReplay
            sample={sample}
            time={replayTime}
            seekNotice={seekNotice}
            onSeek={(time, label) => onSeek(time, label)}
          />
        </DetailSection>
      </div>
      <div className='grid grid-cols-1 xl:grid-cols-2 3xl:grid-cols-1 gap-6 col-span-12 3xl:col-span-4'>
        <MissionInsightsOverviewMedia
          sample={sample}
          onOpenOutput={onOpenOutput}
          onOpenMedia={onOpenMedia}
        />
        <DetailSection title='Run distributions'>
          <div className='grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2'>
            <CategoryChart
              title='Actions by status'
              rows={sample.actions}
              unit='Actions'
            />
            <CategoryChart
              title='Files by type'
              rows={sample.files}
              unit='Files'
            />
          </div>
        </DetailSection>
      </div>
    </div>
  )
}

export function CategoryChart ({
  title,
  rows,
  unit
}: {
  title: string
  rows: ReadonlyArray<readonly [string, number]>
  unit: string
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
    <section className='flex min-w-0 flex-col gap-3' aria-label={title}>
      <h3 className='m-0 text-lg font-medium text-foreground'>{title}</h3>
      {data.length ? (
        <ChartContainer
          className='h-60 min-w-0 w-full'
          config={config}
          aria-label={`${title}; exact values are listed below`}
        >
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              dataKey='count'
              nameKey='name'
              innerRadius={48}
              outerRadius={76}
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
      ) : (
        <p className='m-0 text-muted-foreground'>
          No {unit.toLowerCase()} values recorded.
        </p>
      )}
      {data.length ? (
        <ul className='m-0 flex list-none flex-col gap-2 p-0'>
          {rows.map(([name, count]) => (
            <li key={name} className='flex items-center justify-between gap-3'>
              <span>{name}</span>
              <span className='tabular-nums'>
                {count} {unit.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
