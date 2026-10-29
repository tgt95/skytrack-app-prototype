import { useEffect, useState } from "react";
import {
  CheckIcon,
  UsersIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "skytrack-ui/drawer";
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import type { AccountMenuPanel } from "../../../ui/components/account-menu";
import type {
  AccountProfile,
  NotificationPreferences,
} from "../account/account-menu-state.ts";
import {
  DEFAULT_MISSION_DESIGN_PREFERENCES,
  type MissionDesignPreferences,
} from "../../../shared/mission-design-preferences";
import { MissionDesignPreferencesContent } from "../account/mission-design-preferences-content";

export function AccountMenuDialogs({
  panel,
  profile,
  notifications,
  missionDesignPreferences,
  onClose,
  onSaveProfile,
  onChangeNotifications,
  onChangeMissionDesignPreferences,
  onAnnounce,
  onLogout,
}: {
  panel: AccountMenuPanel | null;
  profile: AccountProfile;
  notifications: NotificationPreferences;
  missionDesignPreferences: MissionDesignPreferences;
  onClose: () => void;
  onSaveProfile: (name: string) => boolean;
  onChangeNotifications: (next: NotificationPreferences) => void;
  onChangeMissionDesignPreferences: (next: MissionDesignPreferences) => void;
  onAnnounce: (message: string) => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const canSaveName = name.trim().length > 0 && name.trim() !== profile.name;

  useEffect(() => {
    setName(profile.name);
  }, [panel, profile.name]);

  const title =
    panel === "profile"
      ? "Profile"
      : panel === "settings"
        ? "Account settings"
        : panel === "preferences"
          ? "Preferences"
          : panel === "notifications"
            ? "Notification settings"
            : panel === "switch"
              ? "Switch account"
              : "Log out?";

  return (
    <>
      <Drawer
        open={panel === "preferences"}
        onOpenChange={(open: boolean) => {
          if (!open) onClose();
        }}
        swipeDirection="right"
      >
        <DrawerPortal className="fixed inset-0 z-2147483647">
          <DrawerBackdrop className="z-2147483646" />
          <DrawerViewport
            side="right"
            className="z-2147483647 pointer-events-none"
          >
            <DrawerPopup
              side="right"
              aria-label="Preferences"
              className="pointer-events-auto w-[min(30rem,calc(100vw-3rem))]"
              data-testid="ms-lib-account-preferences-drawer"
            >
              <DrawerContent className="h-full min-h-0 overflow-hidden">
                <header className="flex flex-none items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <DrawerTitle>Preferences</DrawerTitle>
                  </div>
                  <DrawerClose
                    size="icon"
                    variant="ghost"
                    className="flex-none"
                    aria-label="Close Preferences"
                    onClick={onClose}
                  >
                    <XIcon aria-hidden="true" />
                  </DrawerClose>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <MissionDesignPreferencesContent
                    preferences={missionDesignPreferences}
                    onChange={onChangeMissionDesignPreferences}
                  />
                </div>
                <footer className="flex flex-none justify-between border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onChangeMissionDesignPreferences(
                        DEFAULT_MISSION_DESIGN_PREFERENCES,
                      )
                    }
                  >
                    Reset default
                  </Button>
                  <DrawerClose size="sm" onClick={onClose}>
                    Close
                  </DrawerClose>
                </footer>
              </DrawerContent>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>

      <Dialog
        open={panel !== null && panel !== "preferences"}
        onOpenChange={(open: boolean) => {
          if (!open) onClose();
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            className="ms-lib-account-dialog w-[min(30rem,calc(100vw-2rem))] [@media_(max-width:_32.5rem)]:p-5"
            aria-label={title}
            data-testid={`ms-lib-account-dialog-${panel ?? "closed"}`}
          >
            <DialogHeader>
              <DialogTitle className="heading">{title}</DialogTitle>
              {panel === "profile" ? (
                <DialogDescription>
                  Manage the name shown in your SkyTrack workspace.
                </DialogDescription>
              ) : null}
              {panel === "settings" ? (
                <DialogDescription>
                  Review your account details.
                </DialogDescription>
              ) : null}
              {panel === "notifications" ? (
                <DialogDescription>
                  Choose your in-app activity preferences.
                </DialogDescription>
              ) : null}
              {panel === "switch" ? (
                <DialogDescription>Choose an account.</DialogDescription>
              ) : null}
              {panel === "logout" ? (
                <DialogDescription>
                  Sign out of Mission Studio?
                </DialogDescription>
              ) : null}
            </DialogHeader>

            {panel === "profile" ? (
              <div
                className=" flex flex-col gap-3.5 min-w-0"
                data-testid="ms-lib-account-form"
              >
                <div
                  className=" inline-flex items-center justify-center w-13 h-13 flex-[0_0_auto] rounded-[50%] bg-(--sidebar-primary) text-(--sidebar-primary-foreground) text-[1.3125rem] font-[650]"
                  aria-hidden="true"
                  data-testid="ms-lib-account-edit-avatar"
                >
                  {getUserInitial(name)}
                </div>
                <FieldRoot name="account-display-name">
                  <FieldLabel>Display name</FieldLabel>
                  <FieldControl
                    aria-label="Display name"
                    autoFocus
                    maxLength={80}
                    value={name}
                    onValueChange={(value) =>
                      setName(typeof value === "string" ? value : "")
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && canSaveName) {
                        event.preventDefault();
                        if (onSaveProfile(name)) onClose();
                      }
                    }}
                  />
                </FieldRoot>
                <FieldRoot name="account-email">
                  <FieldLabel>Email</FieldLabel>
                  <FieldControl
                    className=" bg-(--muted) text-(--muted-foreground) cursor-default"
                    aria-label="Email"
                    value={profile.email}
                    readOnly
                  />
                </FieldRoot>
              </div>
            ) : null}

            {panel === "settings" ? (
              <div
                className=" flex flex-col gap-3.5 min-w-0 gap-0"
                data-testid="ms-lib-account-settings-content"
              >
                <div
                  className=" flex items-center justify-between gap-3 min-h-11 border-b border-b-border text-(--muted-foreground) text-[0.8125rem]"
                  data-testid="ms-lib-account-status-row"
                >
                  <span>Account status</span>
                  <Badge count="Active" status="outline" size="sm" />
                </div>
                <AccountDetail label="Email address" value={profile.email} />
              </div>
            ) : null}

            {panel === "notifications" ? (
              <div
                className=" flex flex-col gap-3.5 min-w-0"
                data-testid="ms-lib-account-notifications-content"
              >
                <h3 className="heading m-0 text-[0.8125rem] font-semibold">
                  In-app activity
                </h3>
                <NotificationRow
                  title="Mission activity"
                  description="Updates to missions in your workspace."
                  checked={notifications.missionActivity}
                  onCheckedChange={(checked) =>
                    onChangeNotifications({
                      ...notifications,
                      missionActivity: checked,
                    })
                  }
                />
                <NotificationRow
                  title="Shared project activity"
                  description="Changes to projects shared with you."
                  checked={notifications.sharedProjectActivity}
                  onCheckedChange={(checked) =>
                    onChangeNotifications({
                      ...notifications,
                      sharedProjectActivity: checked,
                    })
                  }
                />
                <NotificationRow
                  title="Workspace updates"
                  description="Changes to workspace resources and access."
                  checked={notifications.workspaceUpdates}
                  onCheckedChange={(checked) =>
                    onChangeNotifications({
                      ...notifications,
                      workspaceUpdates: checked,
                    })
                  }
                />
                <div
                  className=" flex items-center justify-between gap-3 min-h-11 border-b border-b-border text-(--muted-foreground) text-[0.8125rem] [border-bottom:0] text-(--foreground)"
                  data-testid="ms-lib-account-email-status"
                >
                  <span>Email notifications</span>
                  <Badge count="Off" status="secondary" size="sm" />
                </div>
              </div>
            ) : null}

            {panel === "switch" ? (
              <div
                className=" flex flex-col gap-3.5 min-w-0"
                data-testid="ms-lib-account-switch-content"
              >
                <div
                  className=" flex items-center gap-3 min-w-0 p-3 border border-(--primary) rounded-(--radius) bg-(--card)"
                  data-testid="ms-lib-account-current"
                >
                  <span
                    className=" inline-flex items-center justify-center w-13 h-13 flex-[0_0_auto] rounded-[50%] bg-(--sidebar-primary) text-(--sidebar-primary-foreground) text-[1.3125rem] font-[650] w-10.5 h-10.5 text-[1.0625rem]"
                    aria-hidden="true"
                    data-testid="ms-lib-account-current-avatar"
                  >
                    {getUserInitial(profile.name)}
                  </span>
                  <span
                    className=" flex flex-[1_1_auto] flex-col gap-0.75 min-w-0"
                    data-testid="ms-lib-account-current-identity"
                  >
                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">
                      {profile.name}
                    </strong>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-(--muted-foreground) text-xs">
                      {profile.email}
                    </span>
                  </span>
                  <span
                    className="inline-flex text-(--primary)"
                    aria-label="Current account"
                  >
                    <CheckIcon aria-hidden="true" className="w-4.75 h-4.75" />
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onAnnounce(
                      "Sign-in and account linking are not connected in this prototype.",
                    )
                  }
                >
                  <UsersIcon aria-hidden="true" /> Add account
                </Button>
              </div>
            ) : null}

            {panel === "logout" ? (
              <div
                className=" flex flex-col gap-3.5 min-w-0"
                data-testid="ms-lib-account-logout-content"
              >
                <div
                  className="ms-lib-account-callout  flex gap-2.5 border-[color-mix(in_oklab,var(--warning),var(--border)_55%)]"
                  data-testid="ms-lib-account-callout"
                >
                  <WarningCircleIcon
                    aria-hidden="true"
                    className="w-4.75 h-4.75 flex-[0_0_auto] text-(--warning)"
                  />
                  <div>
                    <strong className="font-semibold">
                      You’ll return to sign in
                    </strong>
                    <p className="mt-1 mx-0 mb-0 text-(--muted-foreground) leading-[1.5]">
                      Saved projects and missions stay in this browser. Unsaved
                      changes in this session will be discarded.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              {panel === "profile" ? (
                <>
                  <DialogClose className="w-auto flex-[0_0_auto]">
                    Cancel
                  </DialogClose>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!canSaveName}
                    onClick={() => {
                      if (onSaveProfile(name)) onClose();
                    }}
                    className="w-auto flex-[0_0_auto]"
                  >
                    Save changes
                  </Button>
                </>
              ) : panel === "logout" ? (
                <>
                  <DialogClose className="w-auto flex-[0_0_auto]">
                    Cancel
                  </DialogClose>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onLogout}
                    className="w-auto flex-[0_0_auto]"
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <DialogClose className="w-auto flex-[0_0_auto]">
                  Close
                </DialogClose>
              )}
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\s+/u)[0];
  return firstWord?.[0]?.toLocaleUpperCase() ?? "?";
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div
      className=" flex items-center justify-between gap-3 min-h-11 border-b border-b-border text-(--muted-foreground) text-[0.8125rem]"
      data-testid="ms-lib-account-detail"
    >
      <span>{label}</span>
      <strong className="text-(--foreground) text-[0.8125rem] font-medium text-right">
        {value}
      </strong>
    </div>
  );
}

function NotificationRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `notification-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;

  return (
    <div
      className=" flex items-center justify-between gap-4 min-h-14.5 border-b border-b-border"
      data-testid="ms-lib-account-notification-row"
    >
      <label
        htmlFor={id}
        className=" flex flex-col gap-0.75 min-w-0 cursor-pointer"
        data-testid="ms-lib-account-notification-copy"
      >
        <strong className="text-[0.8125rem] font-medium">{title}</strong>
        <span className="text-(--muted-foreground) text-xs leading-[1.4]">
          {description}
        </span>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      >
        <SwitchThumb />
      </Switch>
    </div>
  );
}
