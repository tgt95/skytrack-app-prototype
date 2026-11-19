import { useEffect, useState } from "react";
import { CaretDownIcon, CheckIcon, LinkIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "skytrack-ui/avatar";
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
import { FieldControl, FieldError, FieldRoot } from "skytrack-ui/field";
import { getNameInitials } from "@/shared/name-initials";
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
  MenuTrigger,
} from "skytrack-ui/menu";
import { readAccountProfile } from "@/features/library/account/account-menu-state";
import type {
  LibMission,
  SharedMissionRole,
} from "@/features/library/database/store";
import { missionStudioRoutePath } from "@/features/library/router";
import { libraryToastManager } from "@/features/library/library-toast-manager";
const SAMPLE_USER_AVATARS: Record<string, string> = {
  "alex.chen@example.com": "/avatars/Male/1.jpg",
  "sam.rivera@example.com": "/avatars/Female/1.jpg",
};

function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function ShareDialog({
  dlg,
  mission,
  onClose,
  onSubmit,
  onRemove,
  onChangeRole,
  onAnnounce,
}: {
  dlg: { projectId: string; missionId: string; name: string } | null;
  mission: LibMission | null;
  onClose: () => void;
  onSubmit: (email: string) => boolean;
  onRemove: (email: string) => void;
  onChangeRole: (email: string, role: SharedMissionRole) => boolean;
  onAnnounce: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const profile = readAccountProfile();
  const sharedWith = mission?.sharedWith ?? [];
  const normalizedEmail = email.trim().toLocaleLowerCase();
  const ownerEmail = profile.email.toLocaleLowerCase();
  const duplicate = sharedWith.some(
    (sharedEmail) => sharedEmail.toLocaleLowerCase() === normalizedEmail,
  );
  const isOwnerEmail = normalizedEmail === ownerEmail;
  useEffect(() => {
    setEmail("");
  }, [dlg]);
  const valid = isEmailLike(email) && !duplicate && !isOwnerEmail;
  const submitInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !onSubmit(email.trim())) return;
    setEmail("");
  };
  const ownerInitials = getNameInitials(profile.name, 2);
  const copyMissionLink = async () => {
    if (!dlg) return;
    const missionPath = missionStudioRoutePath(
      { kind: "mission", missionId: dlg.missionId },
      import.meta.env.BASE_URL,
    );
    const missionUrl = new URL(missionPath, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(missionUrl);
      onAnnounce("Mission link copied.");
      libraryToastManager.add({ title: "Mission link copied." });
    } catch {
      onAnnounce("Could not copy mission link.");
      libraryToastManager.add({ title: "Could not copy mission link." });
    }
  };
  return (
    <Dialog
      open={dlg !== null}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-label="Share mission">
          <DialogHeader>
            <DialogTitle>Share mission</DialogTitle>
            <DialogDescription>
              {dlg ? <>Invite someone to &ldquo;{dlg.name}&rdquo;.</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="ms-lib-form flex flex-col gap-6 py-1 px-0">
            <form className="" onSubmit={submitInvite}>
              <FieldRoot
                name="share-email"
                validationMode="onChange"
                validate={(v) => {
                  const text = typeof v === "string" ? v : "";
                  if (text.length > 0 && !isEmailLike(text))
                    return "Enter a valid email address";
                  if (text.trim().toLocaleLowerCase() === ownerEmail)
                    return "You already own this mission";
                  if (
                    sharedWith.some(
                      (sharedEmail) =>
                        sharedEmail.toLocaleLowerCase() ===
                        text.trim().toLocaleLowerCase(),
                    )
                  )
                    return "This person already has access";
                  return undefined;
                }}
              >
                <div className="flex flex-row w-full min-w-0 gap-3">
                  <FieldControl
                    value={email}
                    onValueChange={(v) =>
                      setEmail(typeof v === "string" ? v : "")
                    }
                    placeholder="Add email address"
                    maxLength={254}
                    aria-label="Email address"
                  />
                  <Button
                    type="submit"
                    variant="default"
                    disabled={!valid}
                    className="w-auto flex-[0_0_auto]"
                  >
                    Invite
                  </Button>
                </div>
                <FieldError />
              </FieldRoot>
            </form>
            {/* <div className='flex items-center justify-between gap-3 rounded-(--radius) border border-border px-3 py-2'>
              <div className='flex flex-col gap-0.5'>
                <span className='font-medium'>Permission</span>
                <span className='text-muted-foreground'>
                  People you invite can view this mission
                </span>
              </div>
              <span className='shrink-0 font-medium'>View only</span>
            </div> */}
            <section
              aria-labelledby="ms-lib-share-access-heading"
              className="flex flex-col gap-2"
            >
              <div className="text-lg font-medium text-(--foreground)">
                Who has access
              </div>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                <li className="flex items-center gap-3 rounded-(--radius) py-2">
                  <Avatar aria-hidden="true">
                    <AvatarFallback>{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">
                    {profile.name} (you)
                  </span>
                  <span className="text-sm shrink-0 text-muted-foreground">
                    Owner
                  </span>
                </li>
                {sharedWith.map((sharedEmail) => {
                  const role =
                    mission?.sharedRoles?.[sharedEmail.toLocaleLowerCase()] ??
                    "view-only";
                  return (
                    <li
                      key={sharedEmail}
                      className="flex items-center gap-3 rounded-(--radius) py-2"
                    >
                      <Avatar aria-hidden="true">
                        {SAMPLE_USER_AVATARS[sharedEmail] ? (
                          <AvatarImage
                            src={SAMPLE_USER_AVATARS[sharedEmail]}
                            alt=""
                          />
                        ) : null}
                        <AvatarFallback>
                          {sharedEmail.slice(0, 1).toLocaleUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={sharedEmail}
                      >
                        {sharedEmail}
                      </span>
                      <Menu>
                        <MenuTrigger
                          aria-label={`Permission for ${sharedEmail}: ${role === "editor" ? "Editor" : "View only"}`}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-(--radius) border-0 bg-transparent px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
                        >
                          {role === "editor" ? "Editor" : "View only"}
                          <CaretDownIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        </MenuTrigger>
                        <MenuPortal>
                          <MenuPositioner
                            side="bottom"
                            align="end"
                            sideOffset={4}
                          >
                            <MenuPopup aria-label={`Access for ${sharedEmail}`}>
                              <MenuRadioGroup
                                value={role}
                                onValueChange={(value) => {
                                  if (
                                    value === "editor" ||
                                    value === "view-only"
                                  )
                                    onChangeRole(sharedEmail, value);
                                }}
                              >
                                <MenuRadioItem
                                  value="editor"
                                  inset
                                  className="!pl-8"
                                >
                                  <MenuRadioItemIndicator>
                                    <CheckIcon
                                      aria-hidden="true"
                                      weight="bold"
                                      className="size-3.5"
                                    />
                                  </MenuRadioItemIndicator>
                                  Editor
                                </MenuRadioItem>
                                <MenuRadioItem
                                  value="view-only"
                                  inset
                                  className="!pl-8"
                                >
                                  <MenuRadioItemIndicator>
                                    <CheckIcon
                                      aria-hidden="true"
                                      weight="bold"
                                      className="size-3.5"
                                    />
                                  </MenuRadioItemIndicator>
                                  View only
                                </MenuRadioItem>
                              </MenuRadioGroup>
                              <MenuSeparator />
                              <MenuItem
                                variant="destructive"
                                inset
                                className="!pl-8"
                                onSelect={() => onRemove(sharedEmail)}
                              >
                                Remove
                              </MenuItem>
                            </MenuPopup>
                          </MenuPositioner>
                        </MenuPortal>
                      </Menu>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
          <DialogFooter className="flex-row flex-wrap items-center justify-between">
            <Button type="button" variant="outline" onClick={copyMissionLink}>
              <LinkIcon aria-hidden="true" />
              Copy link
            </Button>
            <DialogClose className="w-auto flex-[0_0_auto]">Done</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
