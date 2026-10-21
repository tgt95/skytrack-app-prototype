import { useEffect, useState, type FormEvent } from 'react'
import { Button } from 'skytrack-ui/button'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { Input } from 'skytrack-ui/input'
import logo from './assets/skytrack-logo-full.svg?raw'
import LoginDrone from './LoginDrone'
import MissionStudio from './index'

const AUTH_STORAGE_KEY = 'skytrack-mission-studio-authenticated'

export default function MissionStudioApp() {
  const [authenticated, setAuthenticated] = useState(
    () => window.localStorage.getItem(AUTH_STORAGE_KEY) === '1',
  )
  const [error, setError] = useState('')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () =>
      setPrefersReducedMotion(motionQuery.matches)
    syncMotionPreference()
    motionQuery.addEventListener('change', syncMotionPreference)
    return () => motionQuery.removeEventListener('change', syncMotionPreference)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setIsDarkTheme(root.classList.contains('dark'))
    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    // const username = String(formData.get('username') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const loginPassword = import.meta.env.VITE_LOGIN_PASSWORD ?? ''

    if (!loginPassword) {
      setError('Set VITE_LOGIN_PASSWORD in .env, then restart the dev server.')
      return
    }

    // if (!username || password !== loginPassword) {
    if (password !== loginPassword) {
      setError('Username or password is incorrect.')
      return
    }

    setError('')
    window.localStorage.setItem(AUTH_STORAGE_KEY, '1')
    setAuthenticated(true)
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthenticated(false)
  }

  return (
    <main className="mission-studio-host">
      {authenticated ? (
        <MissionStudio onLogout={handleLogout} />
      ) : (
        <section
          className="ms-login-screen"
          aria-labelledby="ms-login-title"
        >
          <div className="ms-login-content">
            <div className="ms-login-card">
              <LoginDrone isDark={isDarkTheme} reducedMotion={prefersReducedMotion} />
              <div
                className="ms-login-brand"
                role="img"
                aria-label="SkyTrack"
                dangerouslySetInnerHTML={{ __html: logo }}
              />
              {/* <div className="ms-login-heading">
                <h1 id="ms-login-title">Sign in</h1>
                <p className="ms-login-description">Login to continue</p>
              </div> */}
              <form className="ms-login-form" onSubmit={handleLogin}>
                {/* <FieldRoot name="username" className="ms-login-field">
                  <FieldLabel htmlFor="ms-login-username">Username</FieldLabel>
                  <Input
                    id="ms-login-username"
                    name="username"
                    autoComplete="username"
                    placeholder="Enter your username"
                    required
                  />
                </FieldRoot> */}
                <FieldRoot name="password" className="ms-login-field">
                  <FieldLabel htmlFor="ms-login-password">Password</FieldLabel>
                  <Input
                    id="ms-login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />
                </FieldRoot>
                {error && (
                  <p className="ms-login-error" role="alert">
                    {error}
                  </p>
                )}
                <Button className="ms-login-submit" type="submit">
                  Sign in
                </Button>
              </form>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
