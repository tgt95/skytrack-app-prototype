import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'skytrack-ui/styles.css'
import './tailwind-utilities.css'
import './main.css'
import { applyThemePreference, readThemePreference } from './shared/theme-preference'
import MissionStudioApp from './App'

applyThemePreference(readThemePreference())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MissionStudioApp />
  </StrictMode>
)
