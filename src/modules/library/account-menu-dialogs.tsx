import { useEffect, useState } from 'react'
import { CheckIcon, UsersIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Button } from 'skytrack-ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from 'skytrack-ui/dialog'
import { FieldControl, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import type { AccountProfile, NotificationPreferences } from './account-menu-state'

export type AccountMenuPanel = 'profile' | 'settings' | 'notifications' | 'switch' | 'logout'

export function AccountMenuDialogs({
  panel,
  profile,
  notifications,
  onClose,
  onSaveProfile,
  onChangeNotifications
}: {
  panel: AccountMenuPanel | null
  profile: AccountProfile
  notifications: NotificationPreferences
  onClose: () => void
  onSaveProfile: (name: string) => boolean
  onChangeNotifications: (next: NotificationPreferences) => void
}) {
  const [name, setName] = useState(profile.name)
  const [addAccountMessage, setAddAccountMessage] = useState(false)
  const canSaveName = name.trim().length > 0 && name.trim() !== profile.name

  useEffect(() => {
    setName(profile.name)
    setAddAccountMessage(false)
  }, [panel, profile.name])

  const title = panel === 'profile'
    ? 'Profile'
    : panel === 'settings'
      ? 'Account settings'
      : panel === 'notifications'
        ? 'Notification settings'
        : panel === 'switch'
          ? 'Switch account'
          : 'Log out?'

  if (panel === null) return null

  return (
    <Dialog open={panel !== null} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className='ms-lib-account-dialog' aria-label={title} data-testid={`ms-lib-account-dialog-${panel ?? 'closed'}`}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {panel === 'profile' ? <DialogDescription>Manage the name shown in your SkyTrack workspace.</DialogDescription> : null}
            {panel === 'settings' ? <DialogDescription>Review the account and security details available in this preview.</DialogDescription> : null}
            {panel === 'notifications' ? <DialogDescription>Choose which activity preferences to save for this browser.</DialogDescription> : null}
            {panel === 'switch' ? <DialogDescription>Choose an account connected to this preview.</DialogDescription> : null}
            {panel === 'logout' ? <DialogDescription>Review what sign-out means in this local preview.</DialogDescription> : null}
          </DialogHeader>

          {panel === 'profile' ? (
            <div className='ms-lib-account-form'>
              <div className='ms-lib-account-edit-avatar' aria-hidden='true'>{getUserInitial(name)}</div>
              <FieldRoot name='account-display-name'>
                <FieldLabel>Display name</FieldLabel>
                <FieldControl
                  aria-label='Display name'
                  autoFocus
                  maxLength={80}
                  value={name}
                  onValueChange={(value) => setName(typeof value === 'string' ? value : '')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canSaveName) {
                      event.preventDefault()
                      if (onSaveProfile(name)) onClose()
                    }
                  }}
                />
              </FieldRoot>
              <FieldRoot name='account-email'>
                <FieldLabel>Email</FieldLabel>
                <FieldControl className='ms-lib-account-readonly' aria-label='Email' value={profile.email} readOnly />
              </FieldRoot>
              <p className='ms-lib-account-note'>Email is read-only in this prototype.</p>
            </div>
          ) : null}

          {panel === 'settings' ? (
            <div className='ms-lib-account-settings-content'>
              <div className='ms-lib-account-status-row'>
                <span>Account status</span>
                <Badge count='Local preview' status='outline' size='sm' />
              </div>
              <AccountDetail label='Email address' value={profile.email} />
              <AccountDetail label='Sign-in method' value='Not connected' />
              <AccountDetail label='Security controls' value='Unavailable in prototype' />
              <div className='ms-lib-account-callout'>
                <strong>Data stays in this browser</strong>
                <p>Projects, missions, and these preferences use local browser storage. They do not sync to a server.</p>
              </div>
            </div>
          ) : null}

          {panel === 'notifications' ? (
            <div className='ms-lib-account-notifications-content'>
              <h3>In-app activity</h3>
              <NotificationRow
                title='Mission activity'
                description='Updates to missions in your workspace.'
                checked={notifications.missionActivity}
                onCheckedChange={(checked) => onChangeNotifications({ ...notifications, missionActivity: checked })}
              />
              <NotificationRow
                title='Shared project activity'
                description='Changes to projects shared with you.'
                checked={notifications.sharedProjectActivity}
                onCheckedChange={(checked) => onChangeNotifications({ ...notifications, sharedProjectActivity: checked })}
              />
              <NotificationRow
                title='Workspace updates'
                description='Changes to workspace resources and access.'
                checked={notifications.workspaceUpdates}
                onCheckedChange={(checked) => onChangeNotifications({ ...notifications, workspaceUpdates: checked })}
              />
              <div className='ms-lib-account-email-status'>
                <span>Email notifications</span>
                <Badge count='Not connected' status='secondary' size='sm' />
              </div>
              <p className='ms-lib-account-note'>Preferences save on this browser. This prototype does not send in-app, push, or email notifications.</p>
            </div>
          ) : null}

          {panel === 'switch' ? (
            <div className='ms-lib-account-switch-content'>
              <div className='ms-lib-account-current'>
                <span className='ms-lib-account-current-avatar' aria-hidden='true'>{getUserInitial(profile.name)}</span>
                <span className='ms-lib-account-current-identity'>
                  <strong>{profile.name}</strong>
                  <span>{profile.email}</span>
                </span>
                <span className='ms-lib-account-current-check' aria-label='Current account'><CheckIcon aria-hidden='true' /></span>
              </div>
              <div className='ms-lib-account-callout'>
                <strong>No other accounts connected</strong>
                <p>Account linking is not available in this local prototype.</p>
              </div>
              {addAccountMessage ? <p className='ms-lib-account-note' role='status'>Sign-in and account linking are not connected in this prototype.</p> : null}
              <Button size='sm' variant='outline' onClick={() => setAddAccountMessage(true)}>
                <UsersIcon aria-hidden='true' /> Add account
              </Button>
            </div>
          ) : null}

          {panel === 'logout' ? (
            <div className='ms-lib-account-logout-content'>
              <div className='ms-lib-account-callout is-notice'>
                <WarningCircleIcon aria-hidden='true' />
                <div>
                  <strong>Sign-out is not connected</strong>
                  <p>This preview has no authentication session to end. Your projects and missions stay saved in this browser.</p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {panel === 'profile' ? (
              <>
                <DialogClose>Cancel</DialogClose>
                <Button size='sm' variant='default' disabled={!canSaveName} onClick={() => { if (onSaveProfile(name)) onClose() }}>
                  Save changes
                </Button>
              </>
            ) : panel === 'logout' ? (
              <DialogClose>Got it</DialogClose>
            ) : (
              <DialogClose>Close</DialogClose>
            )}
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

function getUserInitial(name: string): string {
  const firstWord = name.trim().split(/\s+/u)[0]
  return firstWord?.[0]?.toLocaleUpperCase() ?? '?'
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className='ms-lib-account-detail'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NotificationRow({
  title,
  description,
  checked,
  onCheckedChange
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = `notification-${title.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`

  return (
    <div className='ms-lib-account-notification-row'>
      <label htmlFor={id} className='ms-lib-account-notification-copy'>
        <strong>{title}</strong>
        <span>{description}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={title}>
        <SwitchThumb />
      </Switch>
    </div>
  )
}
