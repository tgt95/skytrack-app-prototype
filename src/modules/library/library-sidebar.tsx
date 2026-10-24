import {
  ArrowSquareOutIcon,
  BellIcon,
  BookOpenIcon,
  CaretDownIcon,
  CheckIcon,
  ClockIcon,
  DesktopIcon,
  DroneIcon,
  FoldersIcon,
  GearIcon,
  GlobeHemisphereWestIcon,
  HouseIcon,
  MoonIcon,
  NotepadIcon,
  PackageIcon,
  ShareNetworkIcon,
  SignOutIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "../../shared/sky-tooltip";
import { getWorkspace, WORKSPACES } from "./workspace-data";
import type { AccountProfile } from "./account-menu-state";
import type { AccountMenuPanel } from "./account-menu-dialogs";
import type { LibrarySection } from "./library";

type NavItem = { id: LibrarySection; label: string; icon: typeof HouseIcon };
const NAV_MAIN: NavItem[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "recent", label: "Recent", icon: ClockIcon },
  { id: "shared", label: "Shared with me", icon: ShareNetworkIcon },
];
const LEARN_URL = "https://getskytrack.com/help/category/get-builders-insights";

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\\s+/u)[0];
  return firstWord?.[0]?.toLocaleUpperCase() ?? "?";
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
  onUpdateThemePreference,
}: {
  section: LibrarySection;
  hasStarredMissions: boolean;
  isSharedAccountsDetail: boolean;
  activeWorkspace: ReturnType<typeof getWorkspace>;
  accountProfile: AccountProfile;
  themePreference: "light" | "dark" | "system";
  onNavigateSection: (section: LibrarySection) => void;
  onSwitchWorkspace: (id: string) => void;
  onAnnounce: (message: string) => void;
  onOpenAccountPanel: (panel: AccountMenuPanel) => void;
  onUpdateThemePreference: (preference: "light" | "dark" | "system") => void;
}) {
  const navBtn = (item: NavItem, disabled: boolean, disabledHint: string) => {
    const Icon = item.icon;
    const active = section === item.id && !isSharedAccountsDetail;
    if (disabled)
      return (
        <button
          key={item.id}
          type="button"
          data-testid={`ms-lib-nav-${item.id}`}
          disabled
          title={disabledHint}
          className="ms-lib-navitem"
        >
          <Icon
            aria-hidden="true"
            weight="regular"
            className="w-[1.25rem] h-[1.25rem] shrink-0"
          />
          <span className="ms-lib-nav-label">{item.label}</span>
        </button>
      );
    return (
      <button
        key={item.id}
        type="button"
        data-testid={`ms-lib-nav-${item.id}`}
        aria-current={active ? "page" : undefined}
        className={`ms-lib-navitem${active ? " is-active" : ""}`}
        onClick={() => onNavigateSection(item.id)}
      >
        <Icon
          aria-hidden="true"
          weight={active ? "fill" : "regular"}
          className="w-[1.25rem] h-[1.25rem] shrink-0"
        />
        <span className="ms-lib-nav-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav
      className="min-h-0 flex-[0_0_16.875rem] min-w-0 flex flex-col gap-[0.5rem] p-[0.75rem_0.375rem] [border-right:0.0625rem_solid_var(--sidebar-border)] bg-(--sidebar) text-(--sidebar-foreground) overflow-y-auto overscroll-contain [@media_(max-width:_61.25rem)]:basis-[4rem] [@media_(max-width:_61.25rem)]:items-stretch [@media_(max-width:_61.25rem)]:p-[0.75rem_0.375rem]"
      aria-label="Workspace navigation"
    >
      <div className="ms-lib-navgroup" role="group" aria-label="Main">
        {NAV_MAIN.map((item) => navBtn(item, false, ""))}
      </div>

      <div className="ms-lib-sidebar-divider" />
      <div
        className="ms-lib-navgroup"
        role="group"
        aria-label="Learning resources"
      >
        <a
          aria-current={section === "learn" ? "page" : undefined}
          className={`ms-lib-navitem${section === "learn" ? " is-active" : ""} [text-decoration:none]`}
          data-testid="ms-lib-nav-learn"
          href={LEARN_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            onAnnounce("Learning opens SkyTrack help in a new tab.")
          }
        >
          <BookOpenIcon
            aria-hidden="true"
            weight={section === "learn" ? "fill" : "regular"}
            className="w-[1.25rem] h-[1.25rem] shrink-0"
          />
          <span className="ms-lib-nav-label">Learning</span>
          <ArrowSquareOutIcon
            aria-hidden="true"
            className=" w-[1.25rem] h-[1.25rem] ml-auto text-(--muted-foreground) flex-[0_0_auto]"
            data-testid="ms-lib-external"
          />
        </a>
        <button
          type="button"
          data-testid="ms-lib-nav-templates"
          aria-current={section === "templates" ? "page" : undefined}
          className={`ms-lib-navitem${section === "templates" ? " is-active" : ""}`}
          onClick={() => onNavigateSection("templates")}
        >
          <SquaresFourIcon
            aria-hidden="true"
            weight={section === "templates" ? "fill" : "regular"}
            className="w-[1.25rem] h-[1.25rem] shrink-0"
          />
          <span className="ms-lib-nav-label">Mission templates</span>
        </button>
      </div>

      <div className="ms-lib-sidebar-divider" />
      <p
        className=" m-[0.25rem_0.5rem_0] text-[0.875rem] font-semibold text-(--muted-foreground) [@media_(max-width:_61.25rem)]:hidden"
        data-testid="ms-lib-navhead"
      >
        Starred
      </p>
      {!hasStarredMissions ? (
        <button
          type="button"
          aria-current={section === "starred" ? "page" : undefined}
          className={[
            `ms-lib-navitem${section === "starred" ? " is-active" : ""}`,
            "cursor-pointer relative cursor-default",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onNavigateSection("starred")}
          data-testid="ms-lib-nav-empty"
        >
          <FoldersIcon
            aria-hidden="true"
            size={20}
            weight={section === "starred" ? "fill" : "regular"}
          />
          <span className="ms-lib-nav-label">No projects/missions</span>
        </button>
      ) : (
        navBtn(
          { id: "starred", label: "Starred missions", icon: StarIcon },
          false,
          "",
        )
      )}

      <div className="ms-lib-sidebar-divider" />
      <div
        className=" flex items-start gap-[0.375rem] min-w-0 p-[0_0.125rem_0.125rem] [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
        data-testid="ms-lib-workspace-head"
      >
        <div className="ms-lib-workspace-switcher flex-[1_1_auto] min-w-0">
          <Menu>
            <MenuTrigger
              aria-label={`Switch workspace, currently ${activeWorkspace.name}`}
              data-testid="ms-lib-workspace-switcher"
              render={
                <button
                  type="button"
                  className=" flex items-center justify-between gap-[0.5rem] w-full min-w-0 min-h-[2rem] p-[0.25rem_0.375rem] [border:0] rounded-(--radius) bg-transparent text-(--sidebar-foreground) text-left cursor-pointer [transition:background-color_150ms_ease,color_150ms_ease] [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) data-popup-open:bg-(--sidebar-accent) data-popup-open:text-(--sidebar-accent-foreground) focus-visible:[outline:0.125rem_solid_var(--ring)] focus-visible:outline-offset-2 [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
                  data-testid="ms-lib-workspace-select"
                />
              }
            >
              <span
                className=" hidden items-center justify-center w-[2.125rem] h-[2.125rem] rounded-(--radius) bg-(--sidebar-accent) text-(--sidebar-accent-foreground) text-[0.875rem] font-bold [@media_(max-width:_61.25rem)]:inline-flex"
                aria-hidden="true"
                data-testid="ms-lib-workspace-avatar"
              >
                {activeWorkspace.name.slice(0, 1)}
              </span>
              <span
                className=" min-w-0 overflow-hidden text-[0.875rem] font-semibold leading-[1.5rem] text-ellipsis whitespace-nowrap [@media_(max-width:_61.25rem)]:hidden"
                data-testid="ms-lib-workspace-name"
              >
                {activeWorkspace.name}
              </span>
              <span
                data-testid="ms-lib-workspace-caret"
                className="inline-flex items-center justify-center w-[1.5rem] h-[1.5rem] flex-[0_0_1.5rem] [@media_(max-width:_61.25rem)]:hidden"
                aria-hidden="true"
              >
                <CaretDownIcon className="w-[1rem] h-[1rem] flex-[0_0_auto]" />
              </span>
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner side="bottom" align="start" sideOffset={4}>
                <MenuPopup aria-label="Workspaces" className="w-72">
                  <MenuRadioGroup
                    value={activeWorkspace.id}
                    onValueChange={(value: string | null) => {
                      if (value) onSwitchWorkspace(value);
                    }}
                  >
                    {WORKSPACES.map((workspace) => (
                      <MenuRadioItem
                        key={workspace.id}
                        value={workspace.id}
                        inset
                      >
                        <MenuRadioItemIndicator>
                          <CheckIcon
                            aria-hidden="true"
                            weight="bold"
                            className="size-3.5"
                          />
                        </MenuRadioItemIndicator>
                        <span>{workspace.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {workspace.role}
                        </span>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuPopup>
              </MenuPositioner>
            </MenuPortal>
          </Menu>
          <div
            className=" m-[0.125rem_0_0_0.375rem] [@media_(max-width:_61.25rem)]:hidden"
            data-testid="ms-lib-workspace-role"
          >
            <Badge count={activeWorkspace.role} status="default" />
          </div>
        </div>
        <SkyTooltip>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className=" mt-[0.25rem] text-(--sidebar-foreground) [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) [@media_(max-width:_61.25rem)]:hidden"
            aria-label="Workspace settings"
            title="Workspace settings"
            onClick={() => onAnnounce(`${activeWorkspace.name} settings`)}
          >
            <GearIcon aria-hidden="true" />
          </Button>
        </SkyTooltip>
      </div>
      <div
        className="ms-lib-navgroup"
        role="group"
        aria-label={`${activeWorkspace.name} resources`}
      >
        {navBtn(
          { id: "projects", label: "Projects", icon: FoldersIcon },
          false,
          "",
        )}
        {navBtn(
          { id: "worlds", label: "Worlds", icon: GlobeHemisphereWestIcon },
          false,
          "",
        )}
        {navBtn({ id: "drones", label: "Drones", icon: DroneIcon }, false, "")}
        {navBtn(
          { id: "aimodels", label: "AI models", icon: PackageIcon },
          false,
          "",
        )}
      </div>

      <div
        className=" mt-auto flex flex-col gap-[0.25rem] pt-[0.75rem]"
        data-testid="ms-lib-side-foot"
      >
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
                  onClick={() => onAnnounce('Discord community')}
                >
                  <UsersIcon aria-hidden='true' /> Join Discord
                </Button>
              </section>
            ) : null} */}
        <button
          type="button"
          data-testid="ms-lib-nav-logs"
          aria-current={section === "logs" ? "page" : undefined}
          className={`ms-lib-navitem${section === "logs" ? " is-active" : ""}`}
          onClick={() => onNavigateSection("logs")}
        >
          <NotepadIcon
            aria-hidden="true"
            weight={section === "logs" ? "fill" : "regular"}
            className="w-[1.25rem] h-[1.25rem] shrink-0"
          />
          <span className="ms-lib-nav-label">Logs</span>
        </button>
        <button
          type="button"
          data-testid="ms-lib-nav-notifications"
          aria-current={section === "notifications" ? "page" : undefined}
          className={`ms-lib-navitem${section === "notifications" ? " is-active" : ""}`}
          onClick={() => onNavigateSection("notifications")}
        >
          <BellIcon
            aria-hidden="true"
            weight={section === "notifications" ? "fill" : "regular"}
            className="w-[1.25rem] h-[1.25rem] shrink-0"
          />
          <span className="ms-lib-nav-label">Notifications</span>
        </button>
        <Menu>
          <MenuTrigger
            type="button"
            className=" [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) flex items-center gap-[0.75rem] min-h-[2.625rem] w-full p-[0.375rem_0.625rem_0.375rem_0.125rem] [border:0] rounded-(--radius) bg-transparent text-(--sidebar-foreground) [font:inherit] text-[0.9375rem] text-left cursor-pointer"
            aria-label={`${accountProfile.name} account menu`}
            data-testid="ms-lib-account-trigger"
          >
            <span
              className=" inline-flex items-center justify-center w-[2rem] h-[2rem] flex-[0_0_auto] rounded-[50%] bg-(--sidebar-primary) text-(--sidebar-primary-foreground) text-[1rem] font-semibold"
              aria-hidden="true"
              data-testid="ms-lib-profile-avatar"
            >
              {getUserInitial(accountProfile.name)}
            </span>
            <span className="ms-lib-nav-label [@media_(max-width:_61.25rem)]:hidden">
              {accountProfile.name}
            </span>
            <CaretDownIcon
              aria-hidden="true"
              className="w-[1rem] h-[1rem] flex-[0_0_auto] ml-auto"
            />
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner side="right" align="end" sideOffset={-2}>
              <MenuPopup
                className="w-[min(16rem,calc(100vw-1.5rem))] p-[0.5rem] rounded-(--radius)"
                aria-label={`${accountProfile.name} account settings`}
              >
                <div
                  className=" flex items-center gap-[0.5rem] min-w-0 mb-[0.5rem] rounded-(--radius) text-(--foreground)"
                  data-testid="ms-lib-account-summary"
                >
                  <span
                    className=" inline-flex items-center justify-center w-[2rem] h-[2rem] flex-[0_0_auto] rounded-[50%] bg-(--accent) text-(--primary) text-[0.875rem] font-bold"
                    aria-hidden="true"
                    data-testid="ms-lib-account-avatar"
                  >
                    {getUserInitial(accountProfile.name)}
                  </span>
                  <span
                    className=" flex flex-col gap-[0.125rem] min-w-0"
                    data-testid="ms-lib-account-identity"
                  >
                    <strong className="overflow-hidden text-[1rem] font-semibold text-ellipsis whitespace-nowrap">
                      {accountProfile.name}
                    </strong>
                    <span className="overflow-hidden text-(--muted-foreground) text-[0.875rem] text-ellipsis whitespace-nowrap">
                      {accountProfile.email}
                    </span>
                  </span>
                </div>
                <MenuSeparator className="ms-lib-account-separator" />
                <MenuItem
                  data-testid="ms-lib-account-profile"
                  onClick={() => onOpenAccountPanel("profile")}
                >
                  <UserIcon aria-hidden="true" /> Profile
                </MenuItem>
                <MenuItem
                  data-testid="ms-lib-account-settings"
                  onClick={() => onOpenAccountPanel("settings")}
                >
                  <GearIcon aria-hidden="true" /> Account settings
                </MenuItem>
                <MenuSubmenuRoot>
                  <MenuSubmenuTrigger data-testid="ms-lib-account-theme">
                    <MoonIcon aria-hidden="true" /> Theme
                  </MenuSubmenuTrigger>
                  <MenuPortal>
                    <MenuPositioner side="right" align="start" sideOffset={4}>
                      <MenuPopup
                        aria-label="Theme options"
                        data-testid="ms-lib-theme-options"
                      >
                        <MenuItem
                          data-testid="ms-lib-theme-light"
                          onClick={() => onUpdateThemePreference("light")}
                        >
                          <SunIcon aria-hidden="true" /> Light{" "}
                          {themePreference === "light" ? (
                            <CheckIcon
                              className="ms-lib-account-theme-check"
                              aria-hidden="true"
                            />
                          ) : null}
                        </MenuItem>
                        <MenuItem
                          data-testid="ms-lib-theme-dark"
                          onClick={() => onUpdateThemePreference("dark")}
                        >
                          <MoonIcon aria-hidden="true" /> Dark{" "}
                          {themePreference === "dark" ? (
                            <CheckIcon
                              className="ms-lib-account-theme-check"
                              aria-hidden="true"
                            />
                          ) : null}
                        </MenuItem>
                        <MenuItem
                          data-testid="ms-lib-theme-system"
                          onClick={() => onUpdateThemePreference("system")}
                        >
                          <DesktopIcon aria-hidden="true" /> System{" "}
                          {themePreference === "system" ? (
                            <CheckIcon
                              className="ms-lib-account-theme-check"
                              aria-hidden="true"
                            />
                          ) : null}
                        </MenuItem>
                      </MenuPopup>
                    </MenuPositioner>
                  </MenuPortal>
                </MenuSubmenuRoot>
                <MenuSeparator className="ms-lib-account-separator" />
                <MenuItem
                  data-testid="ms-lib-account-notifications"
                  onClick={() => onOpenAccountPanel("notifications")}
                >
                  <BellIcon aria-hidden="true" /> Notification settings
                </MenuItem>
                <MenuSeparator className="ms-lib-account-separator" />
                <MenuItem
                  data-testid="ms-lib-account-switch"
                  onClick={() => onOpenAccountPanel("switch")}
                >
                  <UsersIcon aria-hidden="true" /> Switch account
                </MenuItem>
                <MenuItem
                  data-testid="ms-lib-account-logout"
                  onClick={() => onOpenAccountPanel("logout")}
                >
                  <SignOutIcon aria-hidden="true" /> Log out
                </MenuItem>
              </MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </Menu>
      </div>
    </nav>
  );
}
