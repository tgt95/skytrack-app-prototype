import { STORAGE_KEYS } from '../../../shared/storage-keys'

export type AccountProfile = {
  name: string
  email: string
}

export type NotificationPreferences = {
  missionActivity: boolean
  sharedProjectActivity: boolean
  workspaceUpdates: boolean
}

export const DEFAULT_ACCOUNT_PROFILE: AccountProfile = {
  name: 'Tuan Trinh',
  email: 'tuan.tg@qualgo.net'
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  missionActivity: true,
  sharedProjectActivity: true,
  workspaceUpdates: false
}

export function readAccountProfile(): AccountProfile {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.accountProfile)
    if (!stored) return DEFAULT_ACCOUNT_PROFILE

    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object') return DEFAULT_ACCOUNT_PROFILE

    const profile = value as Partial<AccountProfile>
    return {
      name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : DEFAULT_ACCOUNT_PROFILE.name,
      email: DEFAULT_ACCOUNT_PROFILE.email
    }
  } catch {
    return DEFAULT_ACCOUNT_PROFILE
  }
}

export function saveAccountProfile(profile: AccountProfile): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEYS.accountProfile, JSON.stringify({ name: profile.name.trim() }))
    return true
  } catch {
    return false
  }
}

export function readNotificationPreferences(): NotificationPreferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.accountNotifications)
    if (!stored) return DEFAULT_NOTIFICATION_PREFERENCES

    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object') return DEFAULT_NOTIFICATION_PREFERENCES

    const preferences = value as Partial<NotificationPreferences>
    return {
      missionActivity: typeof preferences.missionActivity === 'boolean' ? preferences.missionActivity : DEFAULT_NOTIFICATION_PREFERENCES.missionActivity,
      sharedProjectActivity: typeof preferences.sharedProjectActivity === 'boolean' ? preferences.sharedProjectActivity : DEFAULT_NOTIFICATION_PREFERENCES.sharedProjectActivity,
      workspaceUpdates: typeof preferences.workspaceUpdates === 'boolean' ? preferences.workspaceUpdates : DEFAULT_NOTIFICATION_PREFERENCES.workspaceUpdates
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEYS.accountNotifications, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
