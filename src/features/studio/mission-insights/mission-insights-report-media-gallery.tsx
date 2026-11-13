import {
  FileImageIcon,
  FileVideoIcon,
  LaptopIcon,
  WarningCircleIcon
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Search } from 'skytrack-ui/search'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from 'skytrack-ui/sidebar'
import type { InsightMedia } from './mission-insights-report-data'

export type MediaFilter = 'all' | 'images' | 'videos' | 'detections' | 'remote'
export type MediaBrowserSelection = MediaFilter | 'other-files'

export function matchesMediaFilter (item: InsightMedia, filter: MediaFilter) {
  if (filter === 'images') return item.kind === 'image'
  if (filter === 'videos') return item.kind === 'video'
  if (filter === 'detections') return item.detectionCount > 0
  if (filter === 'remote') return item.availability !== 'local'
  return true
}

export function MediaBrowserFilters ({
  selection,
  onChange,
  groups
}: {
  selection: MediaBrowserSelection
  onChange: (selection: MediaBrowserSelection) => void
  groups: ReadonlyArray<{
    label: string
    items: ReadonlyArray<{ value: MediaBrowserSelection; label: string }>
  }>
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar
      collapsible='none'
      aria-label='Media filters'
      className='h-dvh border-sidebar-border bg-sidebar text-sidebar-foreground [&_.sidebar-content]:flex-col [&_.sidebar-content]:gap-0 [&_.sidebar-group]:border-b [&_.sidebar-group]:border-sidebar-border [&_.sidebar-group]:last:border-b-0 [&_.sidebar-group-label]:px-4 [&_.sidebar-group-label]:py-3 [&_.sidebar-group-label]:text-xs [&_.sidebar-group-label]:font-medium [&_.sidebar-group-label]:text-sidebar-foreground/70 [&_.sidebar-menu-button]:px-4 [&_.sidebar-menu-button]:py-3 [&_.sidebar-menu-button]:text-sm'
    >
      {/* <SidebarHeader className="px-4 py-3">
        <span className="text-xs sub-heading text-sidebar-foreground/70">
          Browse
        </span>
      </SidebarHeader> */}
      <SidebarContent className='gap-0'>
        {groups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={selection === item.value}
                      onClick={() => {
                        onChange(item.value)
                        if (isMobile) setOpenMobile(false)
                      }}
                    >
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

export function MediaFileSearchBar ({
  query,
  onQueryChange,
  trailingFilter
}: {
  query: string
  onQueryChange: (value: string) => void
  trailingFilter: ReactNode
}) {
  return (
    <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <SidebarTrigger className='md:hidden' aria-label='Open media filters' />
        <Search
          value={query}
          onValueChange={onQueryChange}
          placeholder='Search file name'
          aria-label='Search file name'
          className='min-w-0 flex-1'
          size='sm'
        />
      </div>
      {trailingFilter}
    </div>
  )
}

export function MediaBrowserFileList ({
  media,
  syntheticGallery,
  selectedId,
  onSelect,
  searchBar
}: {
  media: InsightMedia[]
  syntheticGallery: boolean
  selectedId: string
  onSelect: (id: string) => void
  searchBar: ReactNode
}) {
  return (
    <section
      className='flex min-w-0 flex-col gap-4 p-6'
      aria-label='Media records'
    >
      {/* <header className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold text-foreground">{syntheticGallery ? "Survey images" : "Captured media"}</h3>
        <Badge className="rounded-(--radius)" count={media.length} status="secondary" />
      </header> */}
      {searchBar}
      <div className='flex min-w-0 flex-col gap-1'>
        <p className='m-0 text-xs sub-heading'>{media.length} records</p>
        {media.length ? (
          <ul
            className='m-0 flex list-none flex-col gap-1 p-0'
            aria-label='Media files'
          >
            {media.map(item => {
              const selected = item.id === selectedId
              const Icon = item.kind === 'video' ? FileVideoIcon : FileImageIcon
              const availability = item.syntheticPreview
                ? 'Preview'
                : item.availability === 'local'
                ? 'On this computer'
                : item.availability === 'remote_only'
                ? 'Mission Computer'
                : item.availability === 'missing'
                ? 'Missing'
                : 'Unavailable'
              return (
                <li key={item.id}>
                  <Button
                    type='button'
                    size='sm'
                    variant={selected ? 'secondary' : 'ghost'}
                    aria-pressed={selected}
                    className='h-auto w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left'
                    onClick={() => onSelect(item.id)}
                  >
                    <Icon
                      className='size-5 shrink-0 text-muted-foreground'
                      aria-hidden='true'
                    />
                    <span className='flex min-w-0 flex-1 flex-col gap-1'>
                      <span className='truncate font-medium'>{item.name}</span>
                      <span className='truncate text-xs text-muted-foreground'>
                        {item.actionName} · {availability}
                      </span>
                    </span>
                    {item.detectionCount > 0 ? (
                      <Badge
                        className='rounded-(--radius)'
                        count={item.detectionCount}
                        status='secondary'
                      />
                    ) : item.availability === 'remote_only' ? (
                      <LaptopIcon
                        className='size-4 shrink-0'
                        aria-hidden='true'
                      />
                    ) : item.availability === 'missing' ? (
                      <WarningCircleIcon
                        className='size-4 shrink-0 text-destructive'
                        aria-hidden='true'
                      />
                    ) : null}
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className='m-0 py-6 text-sm text-muted-foreground'>
            No media records match this search or filter.
          </p>
        )}
      </div>
    </section>
  )
}
