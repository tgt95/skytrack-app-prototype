import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from 'skytrack-ui/button'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import { Input } from 'skytrack-ui/input'
import logo from './assets/skytrack-logo-full.svg?raw'
import LoginDrone from './modules/auth/login-drone'
import MissionStudio from './index'
import { STORAGE_KEYS } from './shared/storage-keys'

export default function MissionStudioApp() {
  const [authenticated, setAuthenticated] = useState(
    () => window.localStorage.getItem(STORAGE_KEYS.authentication) === '1',
  )
  const [error, setError] = useState('')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  const loginCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () =>
      setPrefersReducedMotion(motionQuery.matches)
    syncMotionPreference()
    motionQuery.addEventListener('change', syncMotionPreference)
    return () => motionQuery.removeEventListener('change', syncMotionPreference)
  }, [])

  useLayoutEffect(() => {
    if (authenticated) return

    const card = loginCardRef.current
    const drone = card?.querySelector<HTMLElement>('.ms-login-drone')
    const contour = card?.querySelector<SVGSVGElement>('.ms-login-card-contour')
    const path = contour?.querySelector('path')
    if (!card || !drone || !contour || !path) return

    const updateContour = () => {
      const contourRect = contour.getBoundingClientRect()
      const droneRect = drone.getBoundingClientRect()
      const width = contourRect.width
      if (!width || !droneRect.width || !droneRect.height) return

      const centerX = droneRect.left + droneRect.width / 2 - contourRect.left
      const centerY = droneRect.top + droneRect.height / 2 - contourRect.top
      const radius = Math.min(droneRect.width, droneRect.height) / 2 + 2
      const angle = Math.PI / 6
      const rightX = centerX + radius * Math.cos(angle)
      const leftX = centerX - radius * Math.cos(angle)
      const arcY = centerY + radius * Math.sin(angle)
      const tangentX = -Math.sin(angle)
      const tangentY = Math.cos(angle)
      const handle = Math.min(20, radius * 0.18)
      const shoulderRun = Math.max(24, handle * 1.5)
      const corner = Number.parseFloat(window.getComputedStyle(card).borderTopRightRadius) || 8
      const bottom = centerY + radius
      const height = Math.ceil(bottom + 2)

      contour.setAttribute('viewBox', `0 0 ${width} ${height}`)
      contour.style.height = `${height}px`
      path.setAttribute(
        'd',
        [
          `M ${width} ${corner}`,
          `A ${corner} ${corner} 0 0 0 ${width - corner} 0`,
          `H ${rightX + shoulderRun}`,
          `C ${rightX + shoulderRun - handle} 0 ${rightX - tangentX * handle} ${arcY - tangentY * handle} ${rightX} ${arcY}`,
          `A ${radius} ${radius} 0 0 1 ${leftX} ${arcY}`,
          `C ${leftX + tangentX * handle} ${arcY - tangentY * handle} ${leftX - shoulderRun + handle} 0 ${leftX - shoulderRun} 0`,
          `H ${corner}`,
          `A ${corner} ${corner} 0 0 0 0 ${corner}`,
        ].join(' '),
      )
    }

    updateContour()
    const observer = new ResizeObserver(updateContour)
    observer.observe(card)
    observer.observe(drone)
    return () => observer.disconnect()
  }, [authenticated])

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
    window.localStorage.setItem(STORAGE_KEYS.authentication, '1')
    setAuthenticated(true)
  }

  function handleLogout() {
    window.localStorage.removeItem(STORAGE_KEYS.authentication)
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
            <div className="ms-login-card" ref={loginCardRef}>
              <LoginDrone isDark={isDarkTheme} reducedMotion={prefersReducedMotion} />
              {/* <svg
                className="ms-login-card-contour"
                viewBox="0 0 400 96"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M400 8 A8 8 0 0 0 392 0 H322 C314 0 295.8 30.07 291.8 37 A106 106 0 0 1 108.2 37 C104.2 30.07 86 0 78 0 H8 A8 8 0 0 0 0 8" />
              </svg> */}
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
