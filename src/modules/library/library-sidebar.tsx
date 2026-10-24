import { ArrowSquareOutIcon, BellIcon, BookOpenIcon, CaretDownIcon, CheckIcon, ClockIcon, DesktopIcon, DroneIcon, FoldersIcon, GearIcon, GlobeHemisphereWestIcon, HouseIcon, MoonIcon, NotepadIcon, PackageIcon, ShareNetworkIcon, SignOutIcon, SquaresFourIcon, StarIcon, SunIcon, UserIcon, UsersIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import { Menu, MenuItem, MenuPopup, MenuPortal, MenuPositioner, MenuRadioGroup, MenuRadioItem, MenuRadioItemIndicator, MenuSeparator, MenuSubmenuRoot, MenuSubmenuTrigger, MenuTrigger } from 'skytrack-ui/menu'
import { SkyTooltip } from '../../shared/sky-tooltip'
import { getWorkspace, WORKSPACES } from './workspace-data'
import type { AccountProfile } from './account-menu-state'
import type { AccountMenuPanel } from './account-menu-dialogs'
import type { LibrarySection } from './library'

type NavItem = { id: LibrarySection; label: string; icon: typeof HouseIcon }
const NAV_MAIN: NavItem[] = [
  { id: 'home', label: 'Home', icon: HouseIcon },
  { id: 'recent', label: 'Recent', icon: ClockIcon },
  { id: 'shared', label: 'Shared with me', icon: ShareNetworkIcon }
]
const LEARN_URL = 'https://getskytrack.com/help/category/get-builders-insights'

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\\s+/u)[0]
  return firstWord?.[0]?.toLocaleUpperCase() ?? '?'
}

export default function LibrarySidebar({
  section,
  hasStarredMissions,
  isSharedAccountsDetail,
  activeWorkspace,
  accountProfile,
  themePreference,
  onNavigateSection,
  onSwitchWorkspace,
  onAnnounce,
  onOpenAccountPanel,
  onUpdateThemePreference
}: {
  section: LibrarySection
  hasStarredMissions: boolean
  isSharedAccountsDetail: boolean
  activeWorkspace: ReturnType<typeof getWorkspace>
  accountProfile: AccountProfile
  themePreference: 'light' | 'dark' | 'system'
  onNavigateSection: (section: LibrarySection) => void
  onSwitchWorkspace: (id: string) => void
  onAnnounce: (message: string) => void
  onOpenAccountPanel: (panel: AccountMenuPanel) => void
  onUpdateThemePreference: (preference: 'light' | 'dark' | 'system') => void
}) {
  const navBtn = (item: NavItem, disabled: boolean, disabledHint: string) => {
    const Icon = item.icon
    const active = section === item.id && !isSharedAccountsDetail
    if (disabled) return <button key={item.id} type='button' data-testid={`ms-lib-nav-${item.id}`} disabled title={disabledHint} className='ms-lib-navitem'><Icon aria-hidden='true' weight='regular' /><span className='ms-lib-nav-label'>{item.label}</span></button>
    return <button key={item.id} type='button' data-testid={`ms-lib-nav-${item.id}`} aria-current={active ? 'page' : undefined} className={`ms-lib-navitem${active ? ' is-active' : ''}`} onClick={() => onNavigateSection(item.id)}><Icon aria-hidden='true' weight={active ? 'fill' : 'regular'} /><span className='ms-lib-nav-label'>{item.label}</span></button>
  }

  return (
        <nav className='ms-lib-side' aria-label='Workspace navigation'>
          <div className='ms-lib-navgroup' role='group' aria-label='Main'>
            {NAV_MAIN.map((item) => navBtn(item, false, ''))}
          </div>

          <div className='ms-lib-sidebar-divider' />
          <div className='ms-lib-navgroup' role='group' aria-label='Learning resources'>
            <a
              aria-current={section === 'learn' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'learn' ? ' is-active' : ''}`}
              data-testid='ms-lib-nav-learn'
              href={LEARN_URL}
              target='_blank'
              rel='noreferrer'
              onClick={() => onAnnounce('Learning opens SkyTrack help in a new tab.')}
            >
              <BookOpenIcon aria-hidden='true' weight={section === 'learn' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Learning</span>
              <ArrowSquareOutIcon aria-hidden='true' className='ms-lib-external' />
            </a>
            <button
              type='button'
              data-testid='ms-lib-nav-templates'
              aria-current={section === 'templates' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'templates' ? ' is-active' : ''}`}
              onClick={() => onNavigateSection('templates')}
            >
              <SquaresFourIcon aria-hidden='true' weight={section === 'templates' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Mission templates</span>
            </button>
          </div>

          <div className='ms-lib-sidebar-divider' />
          <p className='ms-lib-navhead'>Starred</p>
          {!hasStarredMissions ? (
            <button
              type='button'
              aria-current={section === 'starred' ? 'page' : undefined}
              className={`ms-lib-navitem ms-lib-nav-empty${section === 'starred' ? ' is-active' : ''}`}
              onClick={() => onNavigateSection('starred')}
            >
              <FoldersIcon aria-hidden='true' weight={section === 'starred' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>No projects/missions</span>
            </button>
          ) : navBtn({ id: 'starred', label: 'Starred missions', icon: StarIcon }, false, '')}

          <div className='ms-lib-sidebar-divider' />
          <div className='ms-lib-workspace-head'>
            <div className='ms-lib-workspace-switcher'>
              <Menu>
                <MenuTrigger
                  aria-label={`Switch workspace, currently ${activeWorkspace.name}`}
                  data-testid='ms-lib-workspace-switcher'
                  render={<button type='button' className='ms-lib-workspace-select' />}
                >
                  <span className='ms-lib-workspace-avatar' aria-hidden='true'>{activeWorkspace.name.slice(0, 1)}</span>
                  <span className='ms-lib-workspace-name'>{activeWorkspace.name}</span>
                  <span className='ms-lib-workspace-caret' aria-hidden='true'><CaretDownIcon /></span>
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner side='bottom' align='start' sideOffset={4}>
                    <MenuPopup aria-label='Workspaces' className='w-72'>
                      <MenuRadioGroup
                        value={activeWorkspace.id}
                        onValueChange={(value: string | null) => {
                          if (value) onSwitchWorkspace(value)
                        }}
                      >
                        {WORKSPACES.map((workspace) => (
                          <MenuRadioItem key={workspace.id} value={workspace.id} inset>
                            <MenuRadioItemIndicator>
                              <CheckIcon aria-hidden='true' weight='bold' className='size-3.5' />
                            </MenuRadioItemIndicator>
                            <span>{workspace.name}</span>
                            <span className='ml-auto text-xs text-muted-foreground'>{workspace.role}</span>
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </Menu>
              <div className='ms-lib-workspace-role'>
                <Badge count={activeWorkspace.role} status='default' />
              </div>
            </div>
            <SkyTooltip><Button
              type='button'
              size='icon-xs'
              variant='ghost'
              className='ms-lib-workspace-settings'
              aria-label='Workspace settings'
              title='Workspace settings are a local prototype control.'
              onClick={() => onAnnounce(`Workspace settings for ${activeWorkspace.name} are a mock.`)}
            >
              <GearIcon aria-hidden='true' />
            </Button></SkyTooltip>
          </div>
          <div className='ms-lib-navgroup' role='group' aria-label={`${activeWorkspace.name} resources`}>
            {navBtn({ id: 'projects', label: 'Projects', icon: FoldersIcon }, false, '')}
            {navBtn({ id: 'worlds', label: 'Worlds', icon: GlobeHemisphereWestIcon }, false, '')}
            {navBtn({ id: 'drones', label: 'Drones', icon: DroneIcon }, false, '')}
            {navBtn({ id: 'aimodels', label: 'AI models', icon: PackageIcon }, false, '')}
          </div>

          <div className='ms-lib-side-foot'>
            {/* {!discordClosed ? (
              <section className='ms-lib-community' aria-label='Join our community'>
                <div className='ms-lib-community-head'>
                  <h2>Join our community</h2>
                  <button
                    type='button'
                    aria-label='Dismiss community card'
                    className='ms-lib-x'
                    onClick={closeDiscord}
                  >
                    <XIcon aria-hidden='true' />
                  </button>
                </div>
                <p>Get setup help &amp; connect with other drone builders on Discord.</p>
                <Button
                  size='sm'
                  variant='default'
                  data-testid='ms-lib-discord'
                  onClick={() => onAnnounce('Join Discord is a mock in this prototype.')}
                >
                  <UsersIcon aria-hidden='true' /> Join Discord
                </Button>
              </section>
            ) : null} */}
            <button
              type='button'
              data-testid='ms-lib-nav-logs'
              aria-current={section === 'logs' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'logs' ? ' is-active' : ''}`}
              onClick={() => onNavigateSection('logs')}
            >
              <NotepadIcon aria-hidden='true' weight={section === 'logs' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Logs</span>
            </button>
            <button
              type='button'
              data-testid='ms-lib-nav-notifications'
              aria-current={section === 'notifications' ? 'page' : undefined}
              className={`ms-lib-navitem${section === 'notifications' ? ' is-active' : ''}`}
              onClick={() => onNavigateSection('notifications')}
            >
              <BellIcon aria-hidden='true' weight={section === 'notifications' ? 'fill' : 'regular'} />
              <span className='ms-lib-nav-label'>Notifications</span>
            </button>
            <Menu>
              <MenuTrigger
                type='button'
                className='ms-lib-profile'
                aria-label={`${accountProfile.name} account menu`}
                data-testid='ms-lib-account-trigger'
              >
                <span className='ms-lib-profile-avatar' aria-hidden='true'>{getUserInitial(accountProfile.name)}</span>
                <span className='ms-lib-nav-label'>{accountProfile.name}</span>
                <CaretDownIcon aria-hidden='true' />
              </MenuTrigger>
              <MenuPortal>
                <MenuPositioner side='right' align='end' sideOffset={-2}>
                  <MenuPopup className='ms-lib-account-popup' aria-label={`${accountProfile.name} account settings`}>
                    <div className='ms-lib-account-summary'>
                      <span className='ms-lib-account-avatar' aria-hidden='true'>
                        {getUserInitial(accountProfile.name)}
                      </span>
                      <span className='ms-lib-account-identity'>
                        <strong>{accountProfile.name}</strong>
                        <span>{accountProfile.email}</span>
                      </span>
                    </div>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      data-testid='ms-lib-account-profile'
                      onClick={() => onOpenAccountPanel('profile')}
                    >
                      <UserIcon aria-hidden='true' /> Profile
                    </MenuItem>
                    <MenuItem
                      data-testid='ms-lib-account-settings'
                      onClick={() => onOpenAccountPanel('settings')}
                    >
                      <GearIcon aria-hidden='true' /> Account settings
                    </MenuItem>
                    <MenuSubmenuRoot>
                      <MenuSubmenuTrigger data-testid='ms-lib-account-theme'>
                        <MoonIcon aria-hidden='true' /> Theme
                      </MenuSubmenuTrigger>
                      <MenuPortal>
                        <MenuPositioner side='right' align='start' sideOffset={4}>
                          <MenuPopup aria-label='Theme options' data-testid='ms-lib-theme-options'>
                            <MenuItem data-testid='ms-lib-theme-light' onClick={() => onUpdateThemePreference('light')}>
                              <SunIcon aria-hidden='true' /> Light {themePreference === 'light' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                            <MenuItem data-testid='ms-lib-theme-dark' onClick={() => onUpdateThemePreference('dark')}>
                              <MoonIcon aria-hidden='true' /> Dark {themePreference === 'dark' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                            <MenuItem data-testid='ms-lib-theme-system' onClick={() => onUpdateThemePreference('system')}>
                              <DesktopIcon aria-hidden='true' /> System {themePreference === 'system' ? <CheckIcon className='ms-lib-account-theme-check' aria-hidden='true' /> : null}
                            </MenuItem>
                          </MenuPopup>
                        </MenuPositioner>
                      </MenuPortal>
                    </MenuSubmenuRoot>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      data-testid='ms-lib-account-notifications'
                      onClick={() => onOpenAccountPanel('notifications')}
                    >
                      <BellIcon aria-hidden='true' /> Notification settings
                    </MenuItem>
                    <MenuSeparator className='ms-lib-account-separator' />
                    <MenuItem
                      data-testid='ms-lib-account-switch'
                      onClick={() => onOpenAccountPanel('switch')}
                    >
                      <UsersIcon aria-hidden='true' /> Switch account
                    </MenuItem>
                    <MenuItem
                      data-testid='ms-lib-account-logout'
                      onClick={() => onOpenAccountPanel('logout')}
                    >
                      <SignOutIcon aria-hidden='true' /> Log out
                    </MenuItem>
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </Menu>
          </div>
        </nav>  )
}
