import { useEffect, useState } from 'react'
import { applyThemePreference, readThemePreference, saveThemePreference, THEME_PREFERENCE_CHANGE_EVENT, type ThemePreference } from '../../../shared/theme-preference'
import type { AccountMenuPanel } from '../../../ui/components/account-menu'
import {
  readAccountProfile,
  readNotificationPreferences,
  saveAccountProfile,
  saveNotificationPreferences,
  type AccountProfile,
  type NotificationPreferences
} from './account-menu-state.ts'

export function useLibraryAccountSettings(onAnnounce: (text: string) => void) {
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(readAccountProfile)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences)
  const [accountPanel, setAccountPanel] = useState<AccountMenuPanel | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    const syncThemePreference = (event: Event) => {
      const preference = (event as CustomEvent<ThemePreference>).detail
      if (preference === 'light' || preference === 'dark' || preference === 'system') {
        setThemePreference(preference)
      }
    }
    window.addEventListener(THEME_PREFERENCE_CHANGE_EVENT, syncThemePreference)
    return () => window.removeEventListener(THEME_PREFERENCE_CHANGE_EVENT, syncThemePreference)
  }, [])

  const updateAccountProfile = (name: string): boolean => {
    const next = { ...accountProfile, name: name.trim() }
    if (!next.name) return false
    if (!saveAccountProfile(next)) {
      onAnnounce('Display name could not be saved in this browser.')
      return false
    }
    setAccountProfile(next)
    onAnnounce('Display name saved on this browser.')
    return true
  }

  const updateNotificationPreferences = (next: NotificationPreferences) => {
    setNotificationPreferences(next)
    if (!saveNotificationPreferences(next)) {
      onAnnounce('Notification preferences could not be saved in this browser.')
    }
  }

  const updateThemePreference = (next: ThemePreference) => {
    setThemePreference(next)
    window.dispatchEvent(new CustomEvent(THEME_PREFERENCE_CHANGE_EVENT, { detail: next }))
    applyThemePreference(next)
    if (!saveThemePreference(next)) {
      onAnnounce('Theme changed, but the preference could not be saved in this browser.')
    } else {
      onAnnounce(`${next === 'system' ? 'System' : next === 'dark' ? 'Dark' : 'Light'} theme selected.`)
    }
  }

  return {
    accountProfile,
    notificationPreferences,
    accountPanel,
    setAccountPanel,
    themePreference,
    updateAccountProfile,
    updateNotificationPreferences,
    updateThemePreference
  }
}
