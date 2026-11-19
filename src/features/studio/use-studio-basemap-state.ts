import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { MissionBasemapStyle } from '@/shared/map-tiles'
import type { ThemePreference } from '@/shared/theme-preference'

interface UseStudioBasemapStateArgs {
  active: boolean
  hasSavedMission: boolean
  themePreference: ThemePreference
  savedBasemapStyle: MissionBasemapStyle | undefined
  basemapStyle: MissionBasemapStyle
  setBasemapStyle: Dispatch<SetStateAction<MissionBasemapStyle>>
}

export function useStudioBasemapState({
  active,
  hasSavedMission,
  themePreference,
  savedBasemapStyle,
  basemapStyle,
  setBasemapStyle,
}: UseStudioBasemapStateArgs) {
  useEffect(() => {
    if (!active) return
    if (savedBasemapStyle) {
      setBasemapStyle(savedBasemapStyle)
      return
    }

    const syncBasemapToTheme = (isDark: boolean) => {
      setBasemapStyle(isDark ? 'dark' : 'light')
    }
    syncBasemapToTheme(document.documentElement.classList.contains('dark'))

    if (themePreference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      syncBasemapToTheme(event.matches)
    }
    media.addEventListener('change', handleSystemThemeChange)
    return () => media.removeEventListener('change', handleSystemThemeChange)
  }, [active, savedBasemapStyle, setBasemapStyle, themePreference])

  const themeBasemapStyle =
    themePreference === 'system'
      ? document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light'
      : themePreference

  return (
    hasSavedMission &&
    basemapStyle !== (savedBasemapStyle ?? themeBasemapStyle)
  )
}
