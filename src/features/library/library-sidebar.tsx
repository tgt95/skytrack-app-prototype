import {
  ArrowSquareOutIcon,
  BellIcon,
  BookOpenIcon,
  ClockIcon,
  DroneIcon,
  FoldersIcon,
  GlobeHemisphereWestIcon,
  HouseIcon,
  NotepadIcon,
  PackageIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { LibraryAccountFooter } from "./account/library-account-footer.tsx";
import { LibraryWorkspaceSwitcher } from "./workspace/library-workspace-switcher.tsx";
import type { AccountProfile } from "./account/account-menu-state.ts";
import type { AccountMenuPanel } from "../../ui/components/account-menu";
import type { WorkspaceDefinition } from "./workspace/workspace-data.ts";
import type { LibrarySection } from "./library-types";

type NavItem = { id: LibrarySection; label: string; icon: typeof HouseIcon };
const NAV_MAIN: NavItem[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "recent", label: "Recent", icon: ClockIcon },
  { id: "shared", label: "Shared with me", icon: ShareNetworkIcon },
];
const LEARN_URL = "https://getskytrack.com/help/category/get-builders-insights";

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
  activeWorkspace: WorkspaceDefinition;
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
            className="size-5 shrink-0"
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
          className="size-5 shrink-0"
        />
        <span className="ms-lib-nav-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav
      className="min-h-0 grow-0 shrink-0 basis-67.5 min-w-0 flex flex-col gap-2 py-3 px-1.5 border-r border-r-(--sidebar-border) bg-(--sidebar) text-(--sidebar-foreground) overflow-y-auto overscroll-contain [@media_(max-width:_61.25rem)]:basis-16 [@media_(max-width:_61.25rem)]:items-stretch [@media_(max-width:_61.25rem)]:py-3 [@media_(max-width:_61.25rem)]:px-1.5"
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
            className="w-5 h-5 shrink-0"
          />
          <span className="ms-lib-nav-label">Learning</span>
          <ArrowSquareOutIcon
            aria-hidden="true"
            className=" w-5 h-5 ml-auto text-(--muted-foreground) flex-[0_0_auto] [@media_(max-width:_61.25rem)]:hidden"
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
            className="w-5 h-5 shrink-0"
          />
          <span className="ms-lib-nav-label">Mission templates</span>
        </button>
      </div>
      <div className="ms-lib-sidebar-divider" />
      <p
        className="mt-1 mx-2 text-xs sub-heading [@media_(max-width:_61.25rem)]:hidden"
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
      <LibraryWorkspaceSwitcher
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={onSwitchWorkspace}
        onAnnounce={onAnnounce}
      />
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
        className=" mt-auto flex flex-col gap-1 pt-3"
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
            className="w-5 h-5 shrink-0"
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
            className="w-5 h-5 shrink-0"
          />
          <span className="ms-lib-nav-label">Notifications</span>
        </button>
        <LibraryAccountFooter
          accountProfile={accountProfile}
          themePreference={themePreference}
          onOpenAccountPanel={onOpenAccountPanel}
          onUpdateThemePreference={onUpdateThemePreference}
        />
      </div>
    </nav>
  );
}
