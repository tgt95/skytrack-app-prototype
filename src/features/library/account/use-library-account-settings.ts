import { useEffect, useState } from 'react'
import { readMissionDesignPreferences, saveMissionDesignPreferences, type MissionDesignPreferences } from '../../../shared/mission-design-preferences'
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
  const [missionDesignPreferences, setMissionDesignPreferences] = useState<MissionDesignPreferences>(readMissionDesignPreferences)

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

  const updateMissionDesignPreferences = (next: MissionDesignPreferences) => {
    if (
      !Number.isFinite(next.targetSpeedMS) || next.targetSpeedMS < 0.1 || next.targetSpeedMS > 30 ||
      !Number.isFinite(next.takeoffAltitudeM) || next.takeoffAltitudeM < 0 || next.takeoffAltitudeM > 500 ||
      !Number.isFinite(next.areaLineSpacingM) || next.areaLineSpacingM < 0.1 || next.areaLineSpacingM > 100
    ) {
      onAnnounce('Mission Design values are outside their supported ranges.')
      return
    }
    setMissionDesignPreferences(next)
    if (!saveMissionDesignPreferences(next)) {
      onAnnounce('Mission Design preferences could not be saved in this browser.')
      return
    }
    onAnnounce('Mission Design preferences saved in this browser.')
  }

  return {
    accountProfile,
    notificationPreferences,
    accountPanel,
    setAccountPanel,
    themePreference,
    missionDesignPreferences,
    updateAccountProfile,
    updateNotificationPreferences,
    updateThemePreference,
    updateMissionDesignPreferences,
  }
}
