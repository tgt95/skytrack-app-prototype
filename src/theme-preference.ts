export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'skytrack-mission-studio-theme-v1'
let systemQuery: MediaQueryList | null = null
let systemChangeHandler: (() => void) | null = null

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light'
  } catch {
    return 'light'
  }
}

export function saveThemePreference(preference: ThemePreference): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference)
    return true
  } catch {
    return false
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  if (systemQuery && systemChangeHandler) {
    systemQuery.removeEventListener('change', systemChangeHandler)
  }
  systemQuery = null
  systemChangeHandler = null

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const applyResolvedTheme = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark)
  }

  if (preference === 'system') {
    applyResolvedTheme(media.matches)
    systemQuery = media
    systemChangeHandler = () => applyResolvedTheme(media.matches)
    media.addEventListener('change', systemChangeHandler)
    return
  }

  applyResolvedTheme(preference === 'dark')
}
