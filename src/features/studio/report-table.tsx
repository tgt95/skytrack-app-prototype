import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { DataTable, type DataTableColumnDef } from 'skytrack-ui/data-table'

const reportTypes = ['Simulation', 'Real', 'HITL'] as const
const reportStatuses = ['Succeeded', 'Failed'] as const

type SimulationReport = {
  id: string
  project: string
  type: typeof reportTypes[number]
  status: typeof reportStatuses[number]
  startedAt: string
  startedAtLabel: string
  durationSeconds: number
  reports: string[]
}

const simulationReports: SimulationReport[] = [
  {
    id: '10092026-130606',
    project: 'Sim-escape-4-1',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-10-09T13:06',
    startedAtLabel: 'Oct 09, 2026 - 13:06',
    durationSeconds: 281.8,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-130231',
    project: 'Sim-escape-4-1',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-10-09T13:02',
    startedAtLabel: 'Oct 09, 2026 - 13:02',
    durationSeconds: 171.8,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-125714',
    project: 'Sim-escape-4-1',
    type: 'Simulation',
    status: 'Succeeded',
    startedAt: '2026-10-09T12:57',
    startedAtLabel: 'Oct 09, 2026 - 12:57',
    durationSeconds: 85.3,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-125400',
    project: 'Sim-escape-4-1',
    type: 'Simulation',
    status: 'Failed',
    startedAt: '2026-10-09T12:54',
    startedAtLabel: 'Oct 09, 2026 - 12:54',
    durationSeconds: 46.2,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-125000',
    project: 'Sim-escape-4-1',
    type: 'Real',
    status: 'Succeeded',
    startedAt: '2026-10-09T12:50',
    startedAtLabel: 'Oct 09, 2026 - 12:50',
    durationSeconds: 193.6,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-124500',
    project: 'Sim-escape-4-1',
    type: 'Real',
    status: 'Failed',
    startedAt: '2026-10-09T12:45',
    startedAtLabel: 'Oct 09, 2026 - 12:45',
    durationSeconds: 72.4,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-123000',
    project: 'Sim-escape-4-1',
    type: 'HITL',
    status: 'Succeeded',
    startedAt: '2026-10-09T12:30',
    startedAtLabel: 'Oct 09, 2026 - 12:30',
    durationSeconds: 248.1,
    reports: ['Mission Insights', 'Post Flight Analysis']
  },
  {
    id: '10092026-121500',
    project: 'Sim-escape-4-1',
    type: 'HITL',
    status: 'Failed',
    startedAt: '2026-10-09T12:15',
    startedAtLabel: 'Oct 09, 2026 - 12:15',
    durationSeconds: 58.9,
    reports: ['Mission Insights', 'Post Flight Analysis']
  }
]

function formatRunLabel(report: SimulationReport) {
  const [date, timestamp] = report.startedAt.split('T')
  const [year, month, day] = date.split('-')
  return `${report.project} - ${timestamp}-${day}${month}${year.slice(-2)}`
}

const columns: DataTableColumnDef<SimulationReport>[] = [
  {
    id: 'Run',
    accessorFn: formatRunLabel,
    header: 'Run',
    cell: ({ row }) => formatRunLabel(row.original)
  },
  {
    id: 'Type',
    accessorKey: 'type',
    header: 'Type'
  },
  {
    id: 'Status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        count={row.original.status}
        status={row.original.status === 'Succeeded' ? 'success' : 'error'}
      />
    )
  },
  {
    id: 'Started',
    accessorKey: 'startedAt',
    header: 'Started',
    cell: ({ row }) => row.original.startedAtLabel
  },
  {
    id: 'Duration',
    accessorKey: 'durationSeconds',
    header: 'Duration',
    meta: { align: 'right' },
    cell: ({ row }) => `${row.original.durationSeconds.toFixed(1)} s`
  },
  {
    id: 'Reports',
    accessorFn: report => report.reports.join(' '),
    header: 'Reports',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <div
        className='flex flex-row flex-wrap gap-2'
        role='group'
        aria-label={`Reports for ${row.original.id}`}
      >
        {row.original.reports.map(report => (
          <Button key={report} variant='outline' size='sm'>
            {report}
          </Button>
        ))}
      </div>
    )
  }
]

export default function SimulationReportTable () {
  return (
    <DataTable
      columns={columns}
      data={simulationReports}
      getRowId={report => report.id}
      pageSize={10}
      searchPlaceholder='Search'
      emptyMessage='No simulation runs match this search.'
    />
  )
}
