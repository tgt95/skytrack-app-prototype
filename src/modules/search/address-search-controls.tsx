import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { Input } from 'skytrack-ui/input'
import { Toolbar, ToolbarButton, ToolbarGroup } from 'skytrack-ui/toolbar'
import MapControlTooltip from '../../shared/map-control-tooltip'
import type { AddressSearchController } from './use-address-search'

export default function AddressSearchControls({ controller, onAnnounce }: {
  controller: AddressSearchController
  onAnnounce: (message: string) => void
}) {
  const {
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
    closeAddressSearch,
    searchAddress,
    selectAddressSuggestion
  } = controller

  return (
    <div className='ms-address-search-group'>
      <Toolbar orientation='horizontal' aria-label='Address search' className={`ms-address-search-toolbar${addressSearchOpen ? ' is-open' : ''}`}>
        <ToolbarGroup className='ms-address-search-items'>
          <MapControlTooltip
            label={addressSearchOpen ? 'Search address' : 'Search map by address'}
            trigger={(
              <ToolbarButton
                ref={addressTriggerRef}
                type='button'
                size='icon'
                aria-label={addressSearchOpen ? 'Search address' : 'Open address search'}
                aria-expanded={addressSearchOpen}
                aria-controls={addressSearchOpen ? 'ms-address-search-input' : undefined}
                disabled={addressSearching}
                onClick={() => {
                  if (addressSearchOpen) {
                    if (addressQuery.trim()) void searchAddress()
                  }
                  else {
                    setAddressSearchStatus('')
                    setAddressSearchOpen(true)
                  }
                }}
              />
            )}
          >
            <MagnifyingGlassIcon aria-hidden='true' />
          </MapControlTooltip>
          {addressSearchOpen ? (
            <div className='ms-address-search-input-wrap is-open'>
              <Input
                id='ms-address-search-input'
                role='combobox'
                aria-autocomplete='list'
                aria-expanded={addressSuggestionsOpen}
                aria-controls={addressSuggestionsOpen ? 'ms-address-suggestions-list' : undefined}
                aria-activedescendant={activeAddressSuggestionIndex >= 0 ? `ms-address-suggestion-${activeAddressSuggestionIndex}` : undefined}
                autoFocus
                type='text'
                inputMode='search'
                autoComplete='off'
                aria-label='Search map by address'
                placeholder='Search address'
                value={addressQuery}
                onChange={(event) => {
                  setAddressQuery(event.currentTarget.value)
                  setAddressSearchStatus('')
                }}
                onCompositionStart={() => {
                  addressCompositionRef.current = true
                  setAddressIsComposing(true)
                }}
                onCompositionEnd={(event) => {
                  addressCompositionRef.current = false
                  setAddressIsComposing(false)
                  setAddressQuery(event.currentTarget.value)
                  setAddressSearchStatus('')
                }}
                onKeyDown={(event) => {
                  if (addressCompositionRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                  if (event.key === 'ArrowDown' && addressSuggestions.length) {
                    event.preventDefault()
                    setAddressSuggestionsOpen(true)
                    setActiveAddressSuggestionIndex((index) => (index + 1) % addressSuggestions.length)
                  } else if (event.key === 'ArrowUp' && addressSuggestions.length) {
                    event.preventDefault()
                    setAddressSuggestionsOpen(true)
                    setActiveAddressSuggestionIndex((index) => index <= 0 ? addressSuggestions.length - 1 : index - 1)
                  } else if (event.key === 'Enter') {
                    event.preventDefault()
                    if (addressSuggestionsOpen && activeAddressSuggestionIndex >= 0) selectAddressSuggestion(addressSuggestions[activeAddressSuggestionIndex])
                    else void searchAddress()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    if (addressSuggestionsOpen) setAddressSuggestionsOpen(false)
                    else {
                      closeAddressSearch({ focusTrigger: true })
                      onAnnounce('Address search closed.')
                    }
                  }
                }}
                className='ms-address-search-input'
              />
            </div>
          ) : null}
          {addressSearchOpen ? (
            <MapControlTooltip label='Close address search' trigger={(
              <ToolbarButton
                type='button'
                size='icon'
                aria-label='Close address search'
                onClick={() => {
                  closeAddressSearch({ focusTrigger: true })
                  onAnnounce('Address search closed.')
                }}
              />
            )}>
              <XIcon aria-hidden='true' />
            </MapControlTooltip>
          ) : null}
        </ToolbarGroup>
      </Toolbar>
      {addressSearchOpen && addressSuggestionsOpen ? (
        <div className='ms-address-suggestions' aria-busy={addressSuggestionBusy || undefined}>
          {addressSuggestionBusy ? <div className='ms-address-suggestions-status' role='status'>Searching places…</div> : null}
          {addressSuggestions.length ? (
            <div id='ms-address-suggestions-list' role='listbox'>
              {addressSuggestions.map((item, index) => (
                <button
                  key={`${item.lat},${item.lon}`}
                  id={`ms-address-suggestion-${index}`}
                  type='button'
                  role='option'
                  aria-selected={index === activeAddressSuggestionIndex}
                  className={`ms-address-suggestion-item${index === activeAddressSuggestionIndex ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAddressSuggestion(item)}
                >
                  <span>{item.displayName}</span>
                </button>
              ))}
            </div>
          ) : addressSuggestionResolvedQuery === addressQuery.trim() && addressQuery.trim().length >= 3 && !addressSuggestionBusy ? (
            <div className='ms-address-suggestions-status'>No matching places.</div>
          ) : null}
          <div className='ms-address-suggestions-credits' aria-label='Search attribution'>
            {addressCredits.map((credit, index) => (
              <a key={`${credit.href}-${index}`} href={credit.href} target='_blank' rel='noreferrer'>{credit.label}</a>
            ))}
          </div>
        </div>
      ) : null}
      {addressSearchOpen && !addressSuggestionsOpen ? (
        <div className='ms-address-search-pop'>
          {addressSearchStatus ? <span className='ms-address-search-status' role='status'>{addressSearchStatus}</span> : null}
          {addressCredits.map((credit, index) => (
            <a key={`${credit.href}-${index}`} className='ms-address-search-credit' href={credit.href} target='_blank' rel='noreferrer'>{credit.label}</a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
