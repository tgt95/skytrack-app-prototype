import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'skytrack-ui/styles.css'
import './ui/styles/tailwind-utilities.css'
import './ui/styles/main.css'
import { applyThemePreference, readThemePreference } from './shared/theme-preference'
import MissionStudioApp from './App'

applyThemePreference(readThemePreference())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MissionStudioApp />
  </StrictMode>
)
