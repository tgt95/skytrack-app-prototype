import {
  BellIcon,
  CaretDownIcon,
  CheckIcon,
  DesktopIcon,
  GearIcon,
  MoonIcon,
  SlidersHorizontalIcon,
  SignOutIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "skytrack-ui/avatar";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "skytrack-ui/menu";
import type { ThemePreference } from "../../shared/theme-preference";

export type AccountMenuPanel =
  | "profile"
  | "settings"
  | "preferences"
  | "notifications"
  | "switch"
  | "logout";

export interface AccountMenuProfile {
  name: string;
  email: string;
}

interface AccountMenuProps {
  profile: AccountMenuProfile;
  themePreference: ThemePreference;
  onOpenPanel: (panel: AccountMenuPanel) => void;
  onUpdateThemePreference: (preference: ThemePreference) => void;
  variant?: "library" | "studio";
}

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\s+/u)[0];
  return firstWord?.[0]?.toLocaleUpperCase() ?? "?";
}

export function AccountMenu({
  profile,
  themePreference,
  onOpenPanel,
  onUpdateThemePreference,
  variant = "library",
}: AccountMenuProps) {
  const compact = variant === "studio";
  const testPrefix = compact ? "ms-studio-account" : "ms-lib-account";

  return (
    <Menu>
      <MenuTrigger
        type="button"
        className={
          compact
            ? "flex size-8 shrink-0 items-center justify-center rounded-(--radius) border-0 bg-transparent p-0 text-(--sidebar-foreground) cursor-pointer hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground)"
            : "[&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) flex items-center gap-3 min-h-10.5 w-full pt-1.5 pr-2.5 pb-1.5 pl-0.5 [border:0] rounded-(--radius) bg-transparent text-(--sidebar-foreground) [font:inherit] text-[0.9375rem] text-left cursor-pointer [@media_(max-width:_61.25rem)]:w-10.5 [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
        }
        aria-label={`${profile.name} account menu`}
        data-testid={`${testPrefix}-trigger`}
      >
        <Avatar aria-hidden="true" data-testid={`${testPrefix}-profile-avatar`}>
          <AvatarFallback>{getUserInitial(profile.name)}</AvatarFallback>
        </Avatar>
        {compact ? null : (
          <>
            <span className="ms-lib-nav-label [@media_(max-width:_61.25rem)]:hidden">
              {profile.name}
            </span>
            <CaretDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 ml-auto [@media_(max-width:_61.25rem)]:hidden"
            />
          </>
        )}
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner side="right" align="end" sideOffset={-2}>
          <MenuPopup
            className="w-[min(16rem,calc(100vw-1.5rem))] p-2 rounded-(--radius)"
            aria-label={`${profile.name} account settings`}
          >
            <div
              className="flex min-w-0 items-center gap-2 mb-2 rounded-(--radius) text-(--foreground)"
              data-testid={`${testPrefix}-summary`}
            >
              <Avatar aria-hidden="true" data-testid={`${testPrefix}-avatar`}>
                <AvatarFallback>{getUserInitial(profile.name)}</AvatarFallback>
              </Avatar>
              <span
                className="flex min-w-0 flex-col gap-0.5"
                data-testid={`${testPrefix}-identity`}
              >
                <strong className="overflow-hidden text-base font-semibold text-ellipsis whitespace-nowrap">
                  {profile.name}
                </strong>
                <span className="overflow-hidden text-(--muted-foreground) text-sm text-ellipsis whitespace-nowrap">
                  {profile.email}
                </span>
              </span>
            </div>
            <MenuSeparator className="ms-lib-account-separator" />
            <MenuItem
              data-testid={`${testPrefix}-profile`}
              onClick={() => onOpenPanel("profile")}
            >
              <UserIcon aria-hidden="true" /> Profile
            </MenuItem>
            <MenuItem
              data-testid={`${testPrefix}-settings`}
              onClick={() => onOpenPanel("settings")}
            >
              <GearIcon aria-hidden="true" /> Account settings
            </MenuItem>
            <MenuItem
              data-testid={`${testPrefix}-preferences`}
              onClick={() => onOpenPanel("preferences")}
            >
              <SlidersHorizontalIcon aria-hidden="true" /> Preferences
            </MenuItem>
            <MenuSubmenuRoot>
              <MenuSubmenuTrigger data-testid={`${testPrefix}-theme`}>
                <MoonIcon aria-hidden="true" /> Theme
              </MenuSubmenuTrigger>
              <MenuPortal>
                <MenuPositioner side="right" align="start" sideOffset={4}>
                  <MenuPopup
                    aria-label="Theme options"
                    data-testid={`${testPrefix}-theme-options`}
                  >
                    <MenuItem
                      data-testid={`${testPrefix}-theme-light`}
                      onClick={() => onUpdateThemePreference("light")}
                    >
                      <SunIcon aria-hidden="true" /> Light
                      {themePreference === "light" ? (
                        <CheckIcon
                          className="ms-lib-account-theme-check"
                          aria-hidden="true"
                        />
                      ) : null}
                    </MenuItem>
                    <MenuItem
                      data-testid={`${testPrefix}-theme-dark`}
                      onClick={() => onUpdateThemePreference("dark")}
                    >
                      <MoonIcon aria-hidden="true" /> Dark
                      {themePreference === "dark" ? (
                        <CheckIcon
                          className="ms-lib-account-theme-check"
                          aria-hidden="true"
                        />
                      ) : null}
                    </MenuItem>
                    <MenuItem
                      data-testid={`${testPrefix}-theme-system`}
                      onClick={() => onUpdateThemePreference("system")}
                    >
                      <DesktopIcon aria-hidden="true" /> System
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
              data-testid={`${testPrefix}-notifications`}
              onClick={() => onOpenPanel("notifications")}
            >
              <BellIcon aria-hidden="true" /> Notification settings
            </MenuItem>
            <MenuSeparator className="ms-lib-account-separator" />
            <MenuItem
              data-testid={`${testPrefix}-switch`}
              onClick={() => onOpenPanel("switch")}
            >
              <UsersIcon aria-hidden="true" /> Switch account
            </MenuItem>
            <MenuItem
              data-testid={`${testPrefix}-logout`}
              onClick={() => onOpenPanel("logout")}
            >
              <SignOutIcon aria-hidden="true" /> Log out
            </MenuItem>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </Menu>
  );
}
