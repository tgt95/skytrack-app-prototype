export type AccountProfile = {
  name: string
  email: string
}

export type NotificationPreferences = {
  missionActivity: boolean
  sharedProjectActivity: boolean
  workspaceUpdates: boolean
}

const PROFILE_STORAGE_KEY = 'skytrack-mission-studio-profile-v1'
const NOTIFICATIONS_STORAGE_KEY = 'skytrack-mission-studio-notifications-v1'

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
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY)
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
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: profile.name.trim() }))
    return true
  } catch {
    return false
  }
}

export function readNotificationPreferences(): NotificationPreferences {
  try {
    const stored = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
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
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
