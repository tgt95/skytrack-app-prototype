import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartScatterIcon, AirplaneLandingIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { DataTable, type DataTableColumnDef } from 'skytrack-ui/data-table'
import { PageHeader } from 'skytrack-ui/page-header'
import {
  missionInsightsSearch,
  missionReportHref,
  missionReportsSearch,
  parseMissionInsightsRoute
} from './mission-report-url'
import {
  formatMissionRunLabel,
  type MissionReportRun
} from './mission-insights/mission-insights-data'
import { MissionInsightsPage } from './mission-insights/mission-insights-page'

type SimulationReport = MissionReportRun

const simulationReports: SimulationReport[] = [
  {
    id: 'run_10072026_091502',
    runName: 'Flight - 10072026-091502',
    project: 'EVA floor',
    world: 'EVA floor',
    type: 'Real',
    status: 'Succeeded',
    startedAt: '2026-10-07T09:15:00+07:00',
    startedAtLabel: 'Oct 07, 2026 - 09:15',
    durationSeconds: 164
  },
  {
    id: '10062026-180654',
    runName: 'Sim run - 10062026-180654',
    project: 'Warehouse',
    world: 'Warehouse',
    type: 'Simulation',
    status: 'Unknown',
    startedAt: '2026-10-06T18:06:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 18:06',
    durationSeconds: 0
  },
  {
    id: '10062026-180422',
    runName: 'Sim run - 10062026-180422',
    project: 'Warehouse',
    world: 'Warehouse',
    type: 'Simulation',
    status: 'Unknown',
    startedAt: '2026-10-06T18:04:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 18:04',
    durationSeconds: 0
  },
  {
    id: '10062026-180154',
    runName: 'Sim run - 10062026-180154',
    project: 'Warehouse',
    world: 'Warehouse',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-10-06T18:01:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 18:01',
    durationSeconds: 3.4
  },
  {
    id: '10062026-180111',
    runName: 'Sim run - 10062026-180111',
    project: 'Warehouse',
    world: 'Warehouse',
    type: 'Simulation',
    status: 'Unknown',
    startedAt: '2026-10-06T18:01:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 18:01',
    durationSeconds: 0
  },
  {
    id: '10062026-160201',
    runName: 'Sim run - 10062026-160201',
    project: 'Grandfinale',
    world: 'Grandfinale',
    type: 'Simulation',
    status: 'Unknown',
    startedAt: '2026-10-06T16:02:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 16:02',
    durationSeconds: 0
  },
  {
    id: '10062026-153944',
    runName: 'Sim run - 10062026-153944',
    project: 'Default',
    world: 'Default',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-10-06T15:39:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 15:39',
    durationSeconds: 126.9
  },
  {
    id: '10062026-153451',
    runName: 'Sim run - 10062026-153451',
    project: 'Default',
    world: 'Default',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-10-06T15:34:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 15:34',
    durationSeconds: 160.5
  },
  {
    id: 'run_10062026_152739',
    runName: 'Sim run - 10062026-152739',
    project: 'Grandfinale',
    world: 'Grandfinale',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-10-06T15:27:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 15:27',
    durationSeconds: 78.2
  },
  {
    id: '10062026-152151',
    runName: 'Sim run - 10062026-152151',
    project: 'Grandfinale',
    world: 'Grandfinale',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-10-06T15:21:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 15:21',
    durationSeconds: 158.1
  },
  {
    id: '10062026-151750',
    runName: 'Sim run - 10062026-151750',
    project: 'Grandfinale',
    world: 'Grandfinale',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-10-06T15:17:00+07:00',
    startedAtLabel: 'Oct 06, 2026 - 15:17',
    durationSeconds: 71.3
  },
  {
    id: 'run_09292026_144239',
    runName: 'Sim run - 09292026-144239',
    project: 'Angiang',
    world: 'Angiang',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-09-29T14:42:00+07:00',
    startedAtLabel: 'Sep 29, 2026 - 14:42',
    durationSeconds: 97.1
  },
  {
    id: '09242026-142316',
    runName: 'Sim run - 09242026-142316',
    project: 'Default',
    world: 'Default',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-09-24T14:23:00+07:00',
    startedAtLabel: 'Sep 24, 2026 - 14:23',
    durationSeconds: 27.5
  },
  {
    id: 'demo_construction_20261112',
    runName: 'Demo · Construction progress mapping',
    project: 'Construction site',
    world: 'Construction site',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-11-12T09:00:00+07:00',
    startedAtLabel: 'Nov 12, 2026 - 09:00',
    durationSeconds: 212,
    demoCase: 'construction-progress'
  },
  {
    id: 'demo_flood_20261111',
    runName: 'Demo · Flood impact survey',
    project: 'River basin',
    world: 'River basin',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-11-11T14:20:00+07:00',
    startedAtLabel: 'Nov 11, 2026 - 14:20',
    durationSeconds: 186,
    demoCase: 'flood-impact'
  },
  {
    id: 'demo_bridge_20261110',
    runName: 'Demo · Bridge inspection mapping',
    project: 'River crossing',
    world: 'River crossing',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-11-10T10:40:00+07:00',
    startedAtLabel: 'Nov 10, 2026 - 10:40',
    durationSeconds: 248,
    demoCase: 'bridge-inspection'
  },
  {
    id: 'demo_erosion_20261109',
    runName: 'Demo · Streambank erosion survey',
    project: 'Creek corridor',
    world: 'Creek corridor',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-11-09T08:30:00+07:00',
    startedAtLabel: 'Nov 09, 2026 - 08:30',
    durationSeconds: 174,
    demoCase: 'erosion-survey'
  },
  {
    id: 'demo_interrupted_20261108',
    runName: 'Demo · Interrupted corridor survey',
    project: 'North service corridor',
    world: 'North service corridor',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-11-08T16:15:00+07:00',
    startedAtLabel: 'Nov 08, 2026 - 16:15',
    durationSeconds: 42,
    demoCase: 'interrupted-survey'
  }
]

const missionReportsWithKnownStatus = simulationReports.filter(
  report => report.status !== 'Unknown'
)

function buildColumns (
  onOpenMissionInsights: (report: SimulationReport) => void
): DataTableColumnDef<SimulationReport>[] {
  return [
    {
      id: 'Name',
      accessorFn: formatMissionRunLabel,
      header: 'Name',
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span>{formatMissionRunLabel(row.original)}</span>
          {/* <span className='text-sm text-muted-foreground'>
            {row.original.world}
          </span> */}
        </div>
      )
    },
    {
      id: 'Type',
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) =>
        row.original.type === 'Real' ? 'Real flight' : row.original.type
    },
    {
      id: 'Status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          className='rounded-(--radius)'
          count={row.original.status}
          status={
            row.original.status === 'Succeeded'
              ? 'success'
              : row.original.status === 'Failed'
              ? 'error'
              : 'secondary'
          }
        />
      )
    },
    {
      id: 'Date',
      accessorKey: 'startedAt',
      header: 'Date',
      cell: ({ row }) => row.original.startedAtLabel
    },
    {
      id: 'Duration',
      accessorKey: 'durationSeconds',
      header: 'Duration',
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.durationSeconds === 0
          ? '0 s'
          : `${row.original.durationSeconds.toFixed(1)} s`
    },
    {
      id: 'Action',
      accessorFn: report => report.status,
      header: 'Action',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className='flex flex-row flex-wrap gap-2'
          role='group'
          aria-label={`Actions for ${row.original.runName}`}
        >
          <Button
            variant='outline'
            size='sm'
            disabled={row.original.status === 'Unknown'}
            onClick={() => {
              const sample = reportSampleFor(row.original)
              if (sample) onOpenMissionInsights(sample)
            }}
            title={row.original.status === 'Unknown' ? 'Report not generated: the run ended before reporting started' : undefined}
          >
            <ChartScatterIcon />
            Mission Insights
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled
          >
            <AirplaneLandingIcon />
            Post Flight Analysis
          </Button>
        </div>
      )
    }
  ]
}

function reportSampleFor (run: SimulationReport): SimulationReport | null {
  if (run.demoCase) return run
  if (run.type === 'Simulation' && run.status === 'Succeeded') {
    return (
      simulationReports.find(item => item.id === 'run_09292026_144239') ?? null
    )
  }
  if (run.type === 'Simulation' && run.status === 'Failed') {
    return (
      simulationReports.find(item => item.id === 'run_10062026_152739') ?? null
    )
  }
  if (run.type === 'Real' && run.status === 'Succeeded') {
    return (
      simulationReports.find(item => item.id === 'run_10072026_091502') ?? null
    )
  }
  return null
}

export default function SimulationReportTable ({
  onSubpageChange,
  onOpenMissionDesign
}: {
  onSubpageChange: (open: boolean) => void
  onOpenMissionDesign: () => void
}) {
  const [insightsRunId, setInsightsRunId] = useState(
    () => parseMissionInsightsRoute(window.location.search)?.runId ?? null
  )
  const showInsights = insightsRunId !== null

  const openMissionInsights = useCallback(
    (report: SimulationReport) => {
      const nextSearch = missionInsightsSearch(
        window.location.search,
        report.id
      )
      const nextUrl = missionReportHref(window.location, nextSearch)
      const currentState = window.history.state
      const historyState: Record<string, unknown> =
        typeof currentState === 'object' && currentState !== null
          ? { ...currentState }
          : {}

      historyState.__skytrackMissionInsightsOpenedFromList = true
      historyState.__skytrackMissionInsightsHistoryDepth = 0
      window.history.pushState(historyState, '', nextUrl)
      setInsightsRunId(report.id)
      onSubpageChange(true)
    },
    [onSubpageChange]
  )

  const returnToMissionReports = useCallback(() => {
    const currentState = window.history.state
    const historyState: Record<string, unknown> =
      typeof currentState === 'object' && currentState !== null
        ? { ...currentState }
        : {}

    if (historyState.__skytrackMissionInsightsOpenedFromList === true) {
      const nestedDepth = Number(
        historyState.__skytrackMissionInsightsHistoryDepth ?? 0
      )
      window.history.go(-(Math.max(0, nestedDepth) + 1))
      return
    }

    delete historyState.__skytrackMissionInsightsOpenedFromList
    const nextSearch = missionReportsSearch(window.location.search)
    window.history.replaceState(
      historyState,
      '',
      missionReportHref(window.location, nextSearch)
    )
    setInsightsRunId(null)
    onSubpageChange(false)
  }, [onSubpageChange])

  useEffect(() => {
    const restoreSubpageFromUrl = () => {
      const nextRunId =
        parseMissionInsightsRoute(window.location.search)?.runId ?? null
      setInsightsRunId(nextRunId)
      onSubpageChange(nextRunId !== null)
    }

    window.addEventListener('popstate', restoreSubpageFromUrl)
    return () => window.removeEventListener('popstate', restoreSubpageFromUrl)
  }, [onSubpageChange])

  useEffect(() => {
    const handleTopbarBack = () => returnToMissionReports()
    window.addEventListener('ms:back-to-mission-reports', handleTopbarBack)
    return () =>
      window.removeEventListener('ms:back-to-mission-reports', handleTopbarBack)
  }, [returnToMissionReports])

  const columns = useMemo(
    () => buildColumns(openMissionInsights),
    [openMissionInsights]
  )
  const selectedRun =
    insightsRunId === null
      ? null
      : missionReportsWithKnownStatus.find(
          report => report.id === insightsRunId
        ) ?? null
  return (
    <>
      <section
        id='mission-reports'
        className='flex min-w-0 flex-col gap-0'
        aria-label='Mission Reports'
        hidden={showInsights}
      >
        <PageHeader
          className='sm:[&_[data-slot=page-header-main]]:!flex-row'
          title='Mission Reports'
        />
        <div className='p-6'>
          <DataTable
            columns={columns}
            data={missionReportsWithKnownStatus}
            getRowId={report => report.id}
            pageSize={10}
            searchPlaceholder='Search runs by name'
            emptyMessage='No mission runs match this search.'
          />
        </div>
      </section>
      {insightsRunId !== null ? (
        <MissionInsightsPage
          run={selectedRun}
          onBack={returnToMissionReports}
          onOpenMissionDesign={onOpenMissionDesign}
        />
      ) : null}
    </>
  )
}
