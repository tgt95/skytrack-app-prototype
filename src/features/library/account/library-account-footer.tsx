import { ReleaseNotesPopover } from "./release-notes-popover.tsx";
import { AccountMenu, type AccountMenuPanel } from "../../../ui/components/account-menu";
import type { AccountProfile } from "./account-menu-state.ts";
import type { ThemePreference } from "../../../shared/theme-preference";

export function LibraryAccountFooter({
  accountProfile,
  themePreference,
  onOpenAccountPanel,
  onUpdateThemePreference,
}: {
  accountProfile: AccountProfile;
  themePreference: ThemePreference;
  onOpenAccountPanel: (panel: AccountMenuPanel) => void;
  onUpdateThemePreference: (preference: ThemePreference) => void;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-center gap-1.5 [@media_(max-width:_61.25rem)]:gap-0"
      data-testid="ms-lib-account-and-help"
    >
      <div className="min-w-0 flex-1 [@media_(max-width:_61.25rem)]:flex-none">
        <AccountMenu
          profile={accountProfile}
          themePreference={themePreference}
          onOpenPanel={onOpenAccountPanel}
          onUpdateThemePreference={onUpdateThemePreference}
        />
      </div>
      <div className="[@media_(max-width:_61.25rem)]:hidden">
        <ReleaseNotesPopover />
      </div>
    </div>
  );
}
