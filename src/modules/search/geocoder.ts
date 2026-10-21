/* geocoder.ts — route-local address search helpers for Mission Studio.
   Nominatim handles explicit searches. Photon handles conservative suggestions
   while typing because the public Nominatim service forbids autocomplete. A module throttle plus the
   same-origin Web Lock serializes requests across tabs in this browser; an
   in-memory Map caches successful AND empty results. Queries/cache are not
   persisted. The selected origin and its provider credit are part of mission
   state, while the raw query is not stored.
   The endpoint or provider adapter is switchable at runtime without a code
   edit. A custom provider must supply its own attribution and stable id:
     window.__missionStudio = { geocoder: {
       id: 'provider-id', attributionLabel: 'Provider attribution',
       attributionHref: 'https://provider.example/terms',
       search: async (query, { signal }) => GeocodeResult[]
     } }
   Policy note (https://operations.osmfoundation.org/policies/nominatim/):
   browsers send their own Referer automatically and forbid overriding
   User-Agent, so a deployment needing an identifying User-Agent must proxy
   through its own backend. Optional `email` is forwarded as Nominatim's
   contact parameter; it does not replace the required Referer/User-Agent.
   The Web Lock is only per same-origin browser profile, not a shared backend
   or all-user limiter. */

export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

export interface GeocoderRuntimeConfig {
  id?: string
  endpoint?: string
  email?: string
  attributionLabel?: string
  attributionHref?: string
  search?: (query: string, options: { signal?: AbortSignal }) => Promise<unknown>
}

const DEFAULT_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'
const MIN_INTERVAL_MS = 1100
const RESULT_LIMIT = 1
const SUGGESTION_LIMIT = 5
const CUSTOM_ATTRIBUTION_REQUIRED = 'Geocoding provider attribution required'
const DEFAULT_ATTRIBUTION = {
  label: '© OpenStreetMap contributors',
  href: 'https://www.openstreetmap.org/copyright'
}

const cache = new Map<string, GeocodeResult[]>()
const suggestionCache = new Map<string, GeocodeResult[]>()
let nextRequestAt = 0
const providerAdapterIds = new WeakMap<NonNullable<GeocoderRuntimeConfig['search']>, number>()
let nextProviderAdapterId = 1

function providerAdapterId(search: GeocoderRuntimeConfig['search']): number {
  if (!search) return 0
  const existing = providerAdapterIds.get(search)
  if (existing) return existing
  const id = nextProviderAdapterId++
  providerAdapterIds.set(search, id)
  return id
}

export function resolveGeocoderConfig(): GeocoderRuntimeConfig & { id: string; endpoint: string; attributionLabel: string; attributionHref: string } {
  try {
    const hook = (window as unknown as { __missionStudio?: { geocoder?: GeocoderRuntimeConfig } }).__missionStudio
      ?.geocoder
    const endpoint =
      typeof hook?.endpoint === 'string' && hook.endpoint.trim() !== '' ? hook.endpoint.trim() : DEFAULT_ENDPOINT
    const email = typeof hook?.email === 'string' && hook.email.trim() !== '' ? hook.email.trim() : undefined
    const attribution = endpoint === DEFAULT_ENDPOINT && !hook?.search
      ? DEFAULT_ATTRIBUTION
      : {
          label: typeof hook?.attributionLabel === 'string' && hook.attributionLabel.trim() ? hook.attributionLabel.trim() : CUSTOM_ATTRIBUTION_REQUIRED,
          href: typeof hook?.attributionHref === 'string' && hook.attributionHref.trim() ? hook.attributionHref.trim() : endpoint
        }
    return {
      ...hook,
      id: typeof hook?.id === 'string' && hook.id.trim() ? hook.id.trim() : endpoint,
      endpoint,
      ...(email ? { email } : {}),
      attributionLabel: attribution.label,
      attributionHref: attribution.href
    }
  } catch {
    return {
      id: DEFAULT_ENDPOINT,
      endpoint: DEFAULT_ENDPOINT,
      attributionLabel: DEFAULT_ATTRIBUTION.label,
      attributionHref: DEFAULT_ATTRIBUTION.href
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function withRateLimitedRequest<T>(signal: AbortSignal | undefined, request: () => Promise<T>): Promise<T> {
  const reserveInThisTab = async () => {
    const requestAt = Math.max(Date.now(), nextRequestAt)
    nextRequestAt = requestAt + MIN_INTERVAL_MS
    const wait = requestAt - Date.now()
    if (wait > 0) await sleep(wait, signal)
    return request()
  }
  // Keep the Web Lock through the provider request and the remainder of the
  // interval. This works across same-origin tabs even when localStorage is
  // blocked. Query and result cache remain memory-only. A shared backend is
  // still needed across different users/devices.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    let callbackStarted = false
    try {
      return await navigator.locks.request('mission-studio-geocoder-rate-limit', { mode: 'exclusive', signal }, async () => {
        callbackStarted = true
        const startedAt = Date.now()
        try {
          return await request()
        } finally {
          const remaining = MIN_INTERVAL_MS - (Date.now() - startedAt)
          // Once a network request has begun, keep the shared lock through the
          // full interval even if its caller aborts; cancellation must not let
          // another tab dispatch early.
          if (remaining > 0) await sleep(remaining)
        }
      })
    } catch (error) {
      if (callbackStarted || signal?.aborted) throw error
      /* Lock API failures fall back to the module-level limiter. */
    }
  }
  return reserveInThisTab()
}

export async function searchGeocoder(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<{ results: GeocodeResult[]; cached: boolean; attribution: { label: string; href: string } }> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return { results: [], cached: false, attribution: DEFAULT_ATTRIBUTION }
  const config = resolveGeocoderConfig()
  const requiresCustomAttribution = config.endpoint !== DEFAULT_ENDPOINT || Boolean(config.search)
  if (requiresCustomAttribution && (
    !config.attributionLabel || config.attributionLabel === CUSTOM_ATTRIBUTION_REQUIRED ||
    !config.attributionHref.startsWith('https://')
  )) {
    throw new Error('Configure the geocoding provider attribution before searching.')
  }
  const adapterId = providerAdapterId(config.search)
  const key = `${config.id}\u0000${config.endpoint}\u0000${config.email ?? ''}\u0000${config.attributionLabel}\u0000${config.attributionHref}\u0000${adapterId}\u0000${normalizedQuery.toLowerCase()}`
  const hit = cache.get(key)
  if (hit) return { results: hit, cached: true, attribution: { label: config.attributionLabel, href: config.attributionHref } }
  const raw = await withRateLimitedRequest(options?.signal, async () => {
    options?.signal?.throwIfAborted()
    const activeConfig = resolveGeocoderConfig()
    if (
      activeConfig.id !== config.id || activeConfig.endpoint !== config.endpoint ||
      activeConfig.email !== config.email || activeConfig.attributionLabel !== config.attributionLabel ||
      activeConfig.attributionHref !== config.attributionHref || providerAdapterId(activeConfig.search) !== adapterId
    ) {
      throw new Error('The geocoding provider changed. Submit the address again.')
    }
    if (requiresCustomAttribution && (
      !activeConfig.attributionLabel || activeConfig.attributionLabel === CUSTOM_ATTRIBUTION_REQUIRED ||
      !activeConfig.attributionHref.startsWith('https://')
    )) {
      throw new Error('Configure the geocoding provider attribution before searching.')
    }
    let providerResult: unknown
    if (activeConfig.search) {
      providerResult = await activeConfig.search(normalizedQuery, { signal: options?.signal })
    } else {
      const params = new URLSearchParams({ q: normalizedQuery, format: 'jsonv2', limit: String(RESULT_LIMIT) })
      if (activeConfig.email) params.set('email', activeConfig.email)
      const response = await fetch(`${activeConfig.endpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: options?.signal
      })
      if (!response.ok) throw new Error('Address search is unavailable. Try again.')
      providerResult = await response.json()
    }
    options?.signal?.throwIfAborted()
    const finalConfig = resolveGeocoderConfig()
    if (
      finalConfig.id !== config.id || finalConfig.endpoint !== config.endpoint ||
      finalConfig.email !== config.email || finalConfig.attributionLabel !== config.attributionLabel ||
      finalConfig.attributionHref !== config.attributionHref || providerAdapterId(finalConfig.search) !== adapterId
    ) {
      throw new Error('The geocoding provider changed. Submit the address again.')
    }
    return providerResult
  })
  // Recheck after releasing the Web Lock too: its rate-limit tail can await
  // after the provider response, during which runtime configuration may change.
  const completedConfig = resolveGeocoderConfig()
  if (
    completedConfig.id !== config.id || completedConfig.endpoint !== config.endpoint ||
    completedConfig.email !== config.email || completedConfig.attributionLabel !== config.attributionLabel ||
    completedConfig.attributionHref !== config.attributionHref || providerAdapterId(completedConfig.search) !== adapterId
  ) {
    throw new Error('The geocoding provider changed. Submit the address again.')
  }
  const results: GeocodeResult[] = []
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as { lat?: unknown; lon?: unknown; display_name?: unknown; displayName?: unknown }
    const lat = Number(candidate.lat)
    const lon = Number(candidate.lon)
    const displayName = typeof candidate.display_name === 'string' ? candidate.display_name : candidate.displayName
    if (
      Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
      Number.isFinite(lon) && lon >= -180 && lon <= 180 &&
      typeof displayName === 'string'
    ) {
      results.push({ lat, lon, displayName })
    }
  }
  // Cache empty results too, so repeated misses cost no request.
  cache.set(key, results)
  return {
    results,
    cached: false,
    attribution: { label: config.attributionLabel, href: config.attributionHref }
  }
}

export async function suggestGeocoder(
  query: string,
  options?: { signal?: AbortSignal; near?: { lat: number; lon: number } }
): Promise<{ results: GeocodeResult[]; cached: boolean }> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 3) return { results: [], cached: false }
  const key = `${normalizedQuery.toLowerCase()}\u0000${options?.near?.lat ?? ''}\u0000${options?.near?.lon ?? ''}`
  const cached = suggestionCache.get(key)
  if (cached) return { results: cached, cached: true }

  const raw = await withRateLimitedRequest(options?.signal, async () => {
    options?.signal?.throwIfAborted()
    const params = new URLSearchParams({ q: normalizedQuery, limit: String(SUGGESTION_LIMIT), lang: 'en' })
    if (options?.near) {
      params.set('lat', String(options.near.lat))
      params.set('lon', String(options.near.lon))
      params.set('zoom', '12')
    }
    const response = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/geo+json, application/json' },
      signal: options?.signal
    })
    if (!response.ok) throw new Error('Address suggestions are unavailable. Try again.')
    return response.json() as Promise<{ features?: Array<{ geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }> }>
  })
  const results: GeocodeResult[] = []
  for (const feature of raw.features ?? []) {
    const coordinates = feature.geometry?.coordinates
    const [lon, lat] = Array.isArray(coordinates) ? coordinates.map(Number) : []
    const props = feature.properties ?? {}
    const displayName = [props.name, props.street, props.housenumber, props.city ?? props.locality, props.state, props.country]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join(', ')
    if (Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180 && displayName) {
      results.push({ lat, lon, displayName })
    }
  }
  suggestionCache.set(key, results)
  return { results, cached: false }
}

export function geocoderAttribution(): { label: string; href: string } {
  const config = resolveGeocoderConfig()
  const href = config.attributionHref.startsWith('https://') ? config.attributionHref : DEFAULT_ATTRIBUTION.href
  return { label: config.attributionLabel, href }
}
