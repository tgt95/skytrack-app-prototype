import { useCallback, useEffect, useRef, useState } from 'react'
import {
  geocoderAttribution,
  searchGeocoder,
  suggestGeocoder,
  type GeocodeResult
} from './geocoder'
import { missionOrigin, withMissionOrigin, type StudioMission } from '../../domain/mission-model'

type MissionCommit = (next: StudioMission, label?: string) => void

export function useAddressSearch({
  mission,
  missionRef,
  section,
  commit,
  say
}: {
  mission: StudioMission
  missionRef: { current: StudioMission }
  section: 'studio' | 'library'
  commit: MissionCommit
  say: (message: string) => void
}) {
  const [addressSearchOpen, setAddressSearchOpen] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressSearchStatus, setAddressSearchStatus] = useState('')
  const [addressSearching, setAddressSearching] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeResult[]>([])
  const [addressSuggestionBusy, setAddressSuggestionBusy] = useState(false)
  const [addressSuggestionsOpen, setAddressSuggestionsOpen] = useState(false)
  const [activeAddressSuggestionIndex, setActiveAddressSuggestionIndex] = useState(-1)
  const [addressSuggestionResolvedQuery, setAddressSuggestionResolvedQuery] = useState<string | null>(null)
  const [addressIsComposing, setAddressIsComposing] = useState(false)
  const [searchMarker, setSearchMarker] = useState<{ latitude: number; longitude: number; label: string } | null>(null)

  const addressCompositionRef = useRef(false)
  const addressTriggerRef = useRef<HTMLButtonElement>(null)
  const restoreAddressFocusRef = useRef(false)
  const addressAbortRef = useRef<AbortController | null>(null)
  const addressSeqRef = useRef(0)
  const suggestionAbortRef = useRef<AbortController | null>(null)
  const suggestionSeqRef = useRef(0)
  const selectedSuggestionQueryRef = useRef<string | null>(null)
  const addressMissionIdRef = useRef(mission.id)

  const currentGeoOrigin = missionOrigin(mission)
  const visibleSearchMarker = searchMarker &&
    Math.abs(searchMarker.latitude - currentGeoOrigin.lat) < 1e-9 &&
    Math.abs(searchMarker.longitude - currentGeoOrigin.lng) < 1e-9
    ? searchMarker
    : null
  const providerCredit = geocoderAttribution()
  const originCredit = mission.origin?.attribution
  const addressCredits = addressSearchOpen
    ? [
      ...(originCredit && !originCredit.label.includes('OpenStreetMap contributors') ? [originCredit] : []),
      ...(!providerCredit.label.includes('OpenStreetMap contributors') ? [providerCredit] : []),
      { label: 'Search by Photon · © OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' }
    ].filter((credit, index, credits) => credits.findIndex((candidate) => candidate.href === credit.href && candidate.label === credit.label) === index)
    : [originCredit ?? providerCredit]

  const closeAddressSearch = useCallback((options?: { focusTrigger?: boolean }) => {
    addressSeqRef.current += 1
    addressAbortRef.current?.abort()
    addressAbortRef.current = null
    suggestionSeqRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setAddressSuggestions([])
    setAddressSuggestionsOpen(false)
    setAddressSuggestionBusy(false)
    setAddressSuggestionResolvedQuery(null)
    setAddressSearchOpen(false)
    setAddressSearching(false)
    setSearchMarker(null)
    if (options?.focusTrigger) restoreAddressFocusRef.current = true
  }, [])

  useEffect(() => {
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    if (addressIsComposing || addressCompositionRef.current) {
      suggestionSeqRef.current += 1
      setAddressSuggestionBusy(false)
      return
    }
    const query = addressQuery.trim()
    setAddressSuggestionResolvedQuery(null)
    setAddressSuggestions([])
    setAddressSuggestionsOpen(false)
    setActiveAddressSuggestionIndex(-1)
    if (!addressSearchOpen || query.length < 3 || selectedSuggestionQueryRef.current === query) {
      selectedSuggestionQueryRef.current = null
      setAddressSuggestions([])
      setAddressSuggestionsOpen(false)
      setAddressSuggestionBusy(false)
      return
    }
    const requestId = suggestionSeqRef.current + 1
    suggestionSeqRef.current = requestId
    const controller = new AbortController()
    suggestionAbortRef.current = controller
    const timer = window.setTimeout(() => {
      setAddressSuggestionBusy(true)
      void suggestGeocoder(query, { signal: controller.signal, near: { lat: currentGeoOrigin.lat, lon: currentGeoOrigin.lng } })
        .then(({ results }) => {
          if (controller.signal.aborted || suggestionSeqRef.current !== requestId) return
          setAddressSuggestions(results)
          setAddressSuggestionResolvedQuery(query)
          setAddressSuggestionsOpen(true)
          setActiveAddressSuggestionIndex(-1)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || suggestionSeqRef.current !== requestId) return
          setAddressSuggestions([])
          setAddressSuggestionsOpen(false)
          setActiveAddressSuggestionIndex(-1)
          setAddressSearchStatus(error instanceof Error ? error.message : 'Address suggestions are unavailable. Try again.')
        })
        .finally(() => {
          if (suggestionSeqRef.current === requestId) {
            suggestionAbortRef.current = null
            setAddressSuggestionBusy(false)
          }
        })
    }, 450)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [addressQuery, addressIsComposing, addressSearchOpen, currentGeoOrigin.lat, currentGeoOrigin.lng])

  useEffect(() => {
    if (!addressSearchOpen) return
    const timer = window.setTimeout(() => document.getElementById('ms-address-search-input')?.focus({ preventScroll: true }), 0)
    return () => window.clearTimeout(timer)
  }, [addressSearchOpen])

  useEffect(() => {
    if (addressSearchOpen || addressSearching || !restoreAddressFocusRef.current) return
    restoreAddressFocusRef.current = false
    addressTriggerRef.current?.focus()
  }, [addressSearchOpen, addressSearching])

  useEffect(() => {
    if (addressMissionIdRef.current === mission.id) return
    addressMissionIdRef.current = mission.id
    closeAddressSearch()
  }, [closeAddressSearch, mission.id])

  useEffect(() => {
    if (section !== 'studio') closeAddressSearch()
  }, [closeAddressSearch, section])

  useEffect(() => {
    if ((mission.worldType ?? '3D') !== '2D') {
      addressSeqRef.current += 1
      addressAbortRef.current?.abort()
      addressAbortRef.current = null
      setAddressSearchOpen(false)
      setAddressSearching(false)
      setSearchMarker(null)
    }
  }, [mission.worldType])

  useEffect(() => () => {
    addressSeqRef.current += 1
    addressAbortRef.current?.abort()
    addressAbortRef.current = null
  }, [])

  const searchAddress = useCallback(async () => {
    const query = addressQuery.trim()
    if (!query || addressSearching) return
    suggestionSeqRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setAddressSuggestionsOpen(false)
    setAddressSuggestions([])
    setAddressSuggestionBusy(false)
    const requestedMissionId = missionRef.current.id
    const requestId = addressSeqRef.current + 1
    addressSeqRef.current = requestId
    addressAbortRef.current?.abort()
    const controller = new AbortController()
    addressAbortRef.current = controller
    setAddressSearching(true)
    setAddressSearchStatus('Searching address…')
    try {
      const { results, attribution } = await searchGeocoder(query, { signal: controller.signal })
      if (controller.signal.aborted || addressSeqRef.current !== requestId) return
      const currentMission = missionRef.current
      if (section !== 'studio' || currentMission.id !== requestedMissionId || (currentMission.worldType ?? '3D') !== '2D' || !addressSearchOpen) return
      const result = results[0]
      if (!result) {
        setAddressSearchStatus('No matching address found.')
        say('No matching address found.')
        return
      }
      const name = result.displayName.split(',').slice(0, 3).join(',')
      commit(
        withMissionOrigin(currentMission, { lat: result.lat, lng: result.lon }, attribution),
        `Mission site moved to ${name}. Existing geometry moved with it.`
      )
      setSearchMarker({ latitude: result.lat, longitude: result.lon, label: name })
      setAddressSearchStatus(`Found ${name}. Mission site moved here; existing geometry moved with it.`)
    } catch (error) {
      if (controller.signal.aborted || addressSeqRef.current !== requestId) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Address search failed. Try again.'
      setAddressSearchStatus(message)
      say(message)
    } finally {
      if (addressSeqRef.current === requestId) {
        addressAbortRef.current = null
        setAddressSearching(false)
      }
    }
  }, [addressQuery, addressSearching, addressSearchOpen, commit, missionRef, say, section])

  const selectAddressSuggestion = useCallback((result: GeocodeResult | null) => {
    if (!result) return
    const name = result.displayName.split(',').slice(0, 3).join(',')
    selectedSuggestionQueryRef.current = result.displayName
    setAddressQuery(result.displayName)
    setAddressSuggestionsOpen(false)
    setAddressSuggestions([])
    setAddressSuggestionResolvedQuery(null)
    setAddressSearchStatus(`Found ${name}. Mission site moved here; existing geometry moved with it.`)
    commit(
      withMissionOrigin(missionRef.current, { lat: result.lat, lng: result.lon }, {
        label: '© OpenStreetMap contributors · Photon',
        href: 'https://www.openstreetmap.org/copyright'
      }),
      `Mission site moved to ${name}. Existing geometry moved with it.`
    )
    setSearchMarker({ latitude: result.lat, longitude: result.lon, label: name })
  }, [commit, missionRef])

  return {
    addressSearchOpen,
    setAddressSearchOpen,
    addressQuery,
    setAddressQuery,
    addressSearchStatus,
    setAddressSearchStatus,
    addressSearching,
    addressSuggestions,
    addressSuggestionBusy,
    addressSuggestionsOpen,
    setAddressSuggestionsOpen,
    activeAddressSuggestionIndex,
    setActiveAddressSuggestionIndex,
    addressSuggestionResolvedQuery,
    addressCompositionRef,
    setAddressIsComposing,
    addressTriggerRef,
    addressCredits,
    visibleSearchMarker,
    closeAddressSearch,
    searchAddress,
    selectAddressSuggestion
  }
}

export type AddressSearchController = ReturnType<typeof useAddressSearch>
