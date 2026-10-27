import {
  BellIcon,
  CaretDownIcon,
  CheckIcon,
  DesktopIcon,
  GearIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react";
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
import { ReleaseNotesPopover } from "./release-notes-popover";
import type { AccountProfile } from "./account-menu-state";
import type { AccountMenuPanel } from "./account-menu-dialogs";

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\\s+/u)[0];
  return firstWord?.[0]?.toLocaleUpperCase() ?? "?";
}

export function LibraryAccountFooter({
  accountProfile,
  themePreference,
  onOpenAccountPanel,
  onUpdateThemePreference,
}: {
  accountProfile: AccountProfile;
  themePreference: "light" | "dark" | "system";
  onOpenAccountPanel: (panel: AccountMenuPanel) => void;
  onUpdateThemePreference: (preference: "light" | "dark" | "system") => void;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-center gap-1.5 [@media_(max-width:_61.25rem)]:gap-0"
      data-testid="ms-lib-account-and-help"
    >
      <div className="min-w-0 flex-1 [@media_(max-width:_61.25rem)]:flex-none">
        <Menu>
          <MenuTrigger
            type="button"
            className=" [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground) flex items-center gap-[0.75rem] min-h-[2.625rem] w-full p-[0.375rem_0.625rem_0.375rem_0.125rem] [border:0] rounded-(--radius) bg-transparent text-(--sidebar-foreground) [font:inherit] text-[0.9375rem] text-left cursor-pointer [@media_(max-width:_61.25rem)]:w-[2.625rem] [@media_(max-width:_61.25rem)]:justify-center [@media_(max-width:_61.25rem)]:p-0"
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
              className="w-[1rem] h-[1rem] flex-[0_0_auto] ml-auto [@media_(max-width:_61.25rem)]:hidden"
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
                    className=" inline-flex items-center justify-center w-[2rem] h-[2rem] flex-[0_0_auto] rounded-[50%] bg-(--accent) text-(--primary) text-sm font-bold"
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
                    <span className="overflow-hidden text-(--muted-foreground) text-sm text-ellipsis whitespace-nowrap">
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
      <div className="[@media_(max-width:_61.25rem)]:hidden">
        <ReleaseNotesPopover />
      </div>
    </div>
  );
}
