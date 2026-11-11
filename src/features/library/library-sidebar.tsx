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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "skytrack-ui/sidebar";
import { Separator } from "skytrack-ui/separator";
import { LibraryAccountFooter } from "./account/library-account-footer.tsx";
import { LibraryWorkspaceSwitcher } from "./workspace/library-workspace-switcher.tsx";
import type { AccountProfile } from "./account/account-menu-state.ts";
import type { AccountMenuPanel } from "@/ui/components/account-menu";
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
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = section === item.id && !isSharedAccountsDetail;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          isActive={active}
          tooltip={item.label}
          data-testid={`ms-lib-nav-${item.id}`}
          onClick={() => onNavigateSection(item.id)}
        >
          <Icon aria-hidden="true" weight={active ? "fill" : "regular"} />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderSectionItem = (
    id: LibrarySection,
    label: string,
    Icon: typeof HouseIcon,
    testId: string,
  ) => {
    const active = section === id;
    return (
      <SidebarMenuItem key={id}>
        <SidebarMenuButton
          isActive={active}
          tooltip={label}
          data-testid={testId}
          onClick={() => onNavigateSection(id)}
        >
          <Icon aria-hidden="true" weight={active ? "fill" : "regular"} />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="none"
      aria-label="Workspace navigation"
      data-testid="ms-lib-sidebar"
    >
      <SidebarContent>
        <SidebarGroup aria-label="Main">
          <SidebarMenu>{NAV_MAIN.map(renderNavItem)}</SidebarMenu>
        </SidebarGroup>
        <Separator />
        <SidebarGroup aria-label="Learning resources">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <a
                    href={LEARN_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      onAnnounce("Learning opens SkyTrack help in a new tab.")
                    }
                  />
                }
                isActive={section === "learn"}
                tooltip="Learning"
                data-testid="ms-lib-nav-learn"
              >
                <BookOpenIcon
                  aria-hidden="true"
                  weight={section === "learn" ? "fill" : "regular"}
                />
                <span>Learning</span>
                <ArrowSquareOutIcon
                  aria-hidden="true"
                  className="ml-auto"
                  data-testid="ms-lib-external"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
            {renderSectionItem(
              "templates",
              "Mission templates",
              SquaresFourIcon,
              "ms-lib-nav-templates",
            )}
          </SidebarMenu>
        </SidebarGroup>
        <Separator />
        <SidebarGroup>
          <SidebarGroupLabel data-testid="ms-lib-navhead">
            Starred
          </SidebarGroupLabel>
          <SidebarMenu>
            {hasStarredMissions ? (
              renderSectionItem(
                "starred",
                "Starred missions",
                StarIcon,
                "ms-lib-nav-starred",
              )
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={section === "starred"}
                  tooltip="No projects/missions"
                  data-testid="ms-lib-nav-empty"
                  onClick={() => onNavigateSection("starred")}
                >
                  <FoldersIcon
                    aria-hidden="true"
                    weight={section === "starred" ? "fill" : "regular"}
                  />
                  <span>No projects/missions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <Separator />
        <SidebarGroup>
          <LibraryWorkspaceSwitcher
            activeWorkspace={activeWorkspace}
            onSwitchWorkspace={onSwitchWorkspace}
            onAnnounce={onAnnounce}
          />
          <SidebarMenu>
            {renderSectionItem(
              "projects",
              "Projects",
              FoldersIcon,
              "ms-lib-nav-projects",
            )}
            {renderSectionItem(
              "worlds",
              "Worlds",
              GlobeHemisphereWestIcon,
              "ms-lib-nav-worlds",
            )}
            {renderSectionItem(
              "drones",
              "Drones",
              DroneIcon,
              "ms-lib-nav-drones",
            )}
            {renderSectionItem(
              "aimodels",
              "AI models",
              PackageIcon,
              "ms-lib-nav-aimodels",
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter data-testid="ms-lib-side-foot">
        <SidebarMenu>
          {renderSectionItem("logs", "Logs", NotepadIcon, "ms-lib-nav-logs")}
          {renderSectionItem(
            "notifications",
            "Notifications",
            BellIcon,
            "ms-lib-nav-notifications",
          )}
        </SidebarMenu>
        <LibraryAccountFooter
          accountProfile={accountProfile}
          themePreference={themePreference}
          onOpenAccountPanel={onOpenAccountPanel}
          onUpdateThemePreference={onUpdateThemePreference}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
