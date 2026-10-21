import type { LibrarySection } from './library'

export type MissionStudioRoute =
  | {
      kind: 'library'
      section: LibrarySection
      projectId?: string
      templateId?: string
      sharedMissionId?: string
      sharedProjectId?: string
    }
  | { kind: 'mission'; missionId: string }
  | { kind: 'not-found'; pathname: string }

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === '/') return ''
  const withoutTrailingSlashes = basePath.replace(/\/+$/, '')
  return withoutTrailingSlashes.startsWith('/') ? withoutTrailingSlashes : `/${withoutTrailingSlashes}`
}

function stripBasePath(pathname: string, basePath: string): string {
  const normalizedBase = normalizeBasePath(basePath)
  if (!normalizedBase) return pathname
  if (pathname === normalizedBase || pathname === `${normalizedBase}/`) return '/'
  return pathname.startsWith(`${normalizedBase}/`) ? pathname.slice(normalizedBase.length) : pathname
}

function addBasePath(pathname: string, basePath: string): string {
  const normalizedBase = normalizeBasePath(basePath)
  if (!normalizedBase) return pathname
  return `${normalizedBase}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

export function parseMissionStudioRoute(pathname: string, basePath = '/'): MissionStudioRoute {
  const appPathname = stripBasePath(pathname, basePath)
  const rawSegments = appPathname.split('/').filter(Boolean)
  const segments = rawSegments.map(decodeSegment)
  if (segments.some((segment) => segment === null)) return { kind: 'not-found', pathname: appPathname }
  const [first, second, third] = segments as string[]

  if (!first || (first === 'home' && !second)) return { kind: 'library', section: 'home' }
  if (first === 'projects' && !second) return { kind: 'library', section: 'projects' }
  if (first === 'projects' && second && !third) {
    return { kind: 'library', section: 'projects', projectId: second }
  }
  if (first === 'recent' && !second) return { kind: 'library', section: 'recent' }
  if (first === 'worlds' && !second) return { kind: 'library', section: 'worlds' }
  if (first === 'drones' && !second) return { kind: 'library', section: 'drones' }
  if (first === 'notifications' && !second) return { kind: 'library', section: 'notifications' }
  if (first === 'starred-missions' && !second) return { kind: 'library', section: 'starred' }
  if (first === 'shared-with-me' && !second) return { kind: 'library', section: 'shared' }
  if (first === 'shared-projects' && second && !third) {
    return { kind: 'library', section: 'shared', sharedProjectId: second }
  }
  if (first === 'learn' && !second) return { kind: 'library', section: 'learn' }
  if (first === 'templates' && !second) return { kind: 'library', section: 'templates' }
  if (first === 'template' && second && !third) {
    return { kind: 'library', section: 'templates', templateId: second }
  }
  if ((first === 'docs' || first === 'documentation') && !second) return { kind: 'library', section: 'docs' }
  if ((first === 'ai-models' || first === 'aimodels') && !second) return { kind: 'library', section: 'aimodels' }
  if (first === 'logs' && !second) return { kind: 'library', section: 'logs' }
  if (first === 'shared-accounts' && second && !third) {
    return { kind: 'library', section: 'home', sharedMissionId: second }
  }
  if ((first === 'mission' || first === 'detail' || first === 'mission-studio') && second && !third) {
    return { kind: 'mission', missionId: second }
  }

  return { kind: 'not-found', pathname: appPathname }
}

export function missionStudioRoutePath(route: MissionStudioRoute, basePath = '/'): string {
  if (route.kind === 'not-found') return addBasePath(route.pathname, basePath)
  if (route.kind === 'mission') return addBasePath(`/mission/${encodeURIComponent(route.missionId)}`, basePath)
  if (route.sharedMissionId) return addBasePath(`/shared-accounts/${encodeURIComponent(route.sharedMissionId)}`, basePath)
  if (route.sharedProjectId) return addBasePath(`/shared-projects/${encodeURIComponent(route.sharedProjectId)}`, basePath)
  if (route.templateId) return addBasePath(`/template/${encodeURIComponent(route.templateId)}`, basePath)
  if (route.section === 'projects' && route.projectId) {
    return addBasePath(`/projects/${encodeURIComponent(route.projectId)}`, basePath)
  }

  const paths: Record<LibrarySection, string> = {
    home: '/home',
    recent: '/recent',
    projects: '/projects',
    worlds: '/worlds',
    drones: '/drones',
    starred: '/starred-missions',
    shared: '/shared-with-me',
    learn: '/learn',
    templates: '/templates',
    docs: '/docs',
    aimodels: '/ai-models',
    logs: '/logs',
    notifications: '/notifications'
  }
  return addBasePath(paths[route.section], basePath)
}
