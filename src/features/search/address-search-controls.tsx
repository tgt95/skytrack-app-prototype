import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Input } from "skytrack-ui/input";
import { Toolbar, ToolbarButton, ToolbarGroup } from "skytrack-ui/toolbar";
import MapControlTooltip from "../../ui/components/map-control-tooltip";
import type { AddressSearchController } from "./use-address-search";

export default function AddressSearchControls({
  controller,
  onAnnounce,
}: {
  controller: AddressSearchController;
  onAnnounce: (message: string) => void;
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
    selectAddressSuggestion,
  } = controller;

  return (
    <div
      className=" relative self-end flex flex-col items-end max-w-full gap-1"
      data-testid="ms-address-search-group"
    >
      <Toolbar
        orientation="horizontal"
        aria-label="Address search"
        className={[
          addressSearchOpen ? "is-open" : "",
          "w-10.5 min-h-10.5 justify-start overflow-hidden [transition:width_180ms_ease] [&.is-open]:w-77.5 [&.is-open]:max-w-full",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <ToolbarGroup
          className=" w-full min-w-0 gap-1"
          data-testid="ms-address-search-items"
        >
          <MapControlTooltip
            label={
              addressSearchOpen ? "Search address" : "Search map by address"
            }
            trigger={
              <ToolbarButton
                ref={addressTriggerRef}
                type="button"
                size="icon"
                aria-label={
                  addressSearchOpen ? "Search address" : "Open address search"
                }
                aria-expanded={addressSearchOpen}
                aria-controls={
                  addressSearchOpen ? "ms-address-search-input" : undefined
                }
                disabled={addressSearching}
                onClick={() => {
                  if (addressSearchOpen) {
                    if (addressQuery.trim()) void searchAddress();
                  } else {
                    setAddressSearchStatus("");
                    setAddressSearchOpen(true);
                  }
                }}
              />
            }
          >
            <MagnifyingGlassIcon aria-hidden="true" />
          </MapControlTooltip>
          {addressSearchOpen ? (
            <div
              className={
                " is-open w-0 flex-[1_1_auto] min-w-0 overflow-hidden opacity-[0] [transition:width_180ms_ease,opacity_120ms_ease] [&.is-open]:w-auto [&.is-open]:opacity-[1]"
              }
              data-testid="ms-address-search-input-wrap"
            >
              <Input
                id="ms-address-search-input"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={addressSuggestionsOpen}
                aria-controls={
                  addressSuggestionsOpen
                    ? "ms-address-suggestions-list"
                    : undefined
                }
                aria-activedescendant={
                  activeAddressSuggestionIndex >= 0
                    ? `ms-address-suggestion-${activeAddressSuggestionIndex}`
                    : undefined
                }
                autoFocus
                type="text"
                inputMode="search"
                autoComplete="off"
                aria-label="Search map by address"
                placeholder="Search address"
                value={addressQuery}
                onChange={(event) => {
                  setAddressQuery(event.currentTarget.value);
                  setAddressSearchStatus("");
                }}
                onCompositionStart={() => {
                  addressCompositionRef.current = true;
                  setAddressIsComposing(true);
                }}
                onCompositionEnd={(event) => {
                  addressCompositionRef.current = false;
                  setAddressIsComposing(false);
                  setAddressQuery(event.currentTarget.value);
                  setAddressSearchStatus("");
                }}
                onKeyDown={(event) => {
                  if (
                    addressCompositionRef.current ||
                    event.nativeEvent.isComposing ||
                    event.nativeEvent.keyCode === 229
                  )
                    return;
                  if (event.key === "ArrowDown" && addressSuggestions.length) {
                    event.preventDefault();
                    setAddressSuggestionsOpen(true);
                    setActiveAddressSuggestionIndex(
                      (index) => (index + 1) % addressSuggestions.length,
                    );
                  } else if (
                    event.key === "ArrowUp" &&
                    addressSuggestions.length
                  ) {
                    event.preventDefault();
                    setAddressSuggestionsOpen(true);
                    setActiveAddressSuggestionIndex((index) =>
                      index <= 0 ? addressSuggestions.length - 1 : index - 1,
                    );
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (
                      addressSuggestionsOpen &&
                      activeAddressSuggestionIndex >= 0
                    )
                      selectAddressSuggestion(
                        addressSuggestions[activeAddressSuggestionIndex],
                      );
                    else void searchAddress();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (addressSuggestionsOpen)
                      setAddressSuggestionsOpen(false);
                    else {
                      closeAddressSearch({ focusTrigger: true });
                      onAnnounce("Address search closed.");
                    }
                  }
                }}
                className="ms-address-search-input w-full min-w-0 h-8 border-(--border) bg-(--background) text-(--foreground)"
              />
            </div>
          ) : null}
          {addressSearchOpen ? (
            <MapControlTooltip
              label="Close address search"
              trigger={
                <ToolbarButton
                  type="button"
                  size="icon"
                  aria-label="Close address search"
                  onClick={() => {
                    closeAddressSearch({ focusTrigger: true });
                    onAnnounce("Address search closed.");
                  }}
                />
              }
            >
              <XIcon aria-hidden="true" />
            </MapControlTooltip>
          ) : null}
        </ToolbarGroup>
      </Toolbar>
      {addressSearchOpen && addressSuggestionsOpen ? (
        <div
          className=" absolute right-0 bottom-[calc(100%+0.375rem)] z-60 w-[min(19.375rem,calc(100vw-2rem))] max-h-[min(17.5rem,45vh)] overflow-auto border border-border rounded-(--radius) bg-(--popover) text-(--popover-foreground) [box-shadow:0_0.5rem_1.75rem_color-mix(in_srgb,var(--foreground)_22%,transparent)]"
          aria-busy={addressSuggestionBusy || undefined}
          data-testid="ms-address-suggestions"
        >
          {addressSuggestionBusy ? (
            <div className="ms-address-suggestions-status" role="status">
              Searching places…
            </div>
          ) : null}
          {addressSuggestions.length ? (
            <div id="ms-address-suggestions-list" role="listbox">
              {addressSuggestions.map((item, index) => (
                <button
                  key={`${item.lat},${item.lon}`}
                  id={`ms-address-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeAddressSuggestionIndex}
                  className={[
                    index === activeAddressSuggestionIndex ? "is-active" : "",
                    "flex w-full gap-2 [border:0] py-2 px-2.5 bg-transparent text-inherit [font:inherit] whitespace-normal text-left cursor-pointer [&:hover]:bg-(--accent) [&:hover]:text-(--accent-foreground) [&.is-active]:bg-(--accent) [&.is-active]:text-(--accent-foreground)",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAddressSuggestion(item)}
                >
                  <span>{item.displayName}</span>
                </button>
              ))}
            </div>
          ) : addressSuggestionResolvedQuery === addressQuery.trim() &&
            addressQuery.trim().length >= 3 &&
            !addressSuggestionBusy ? (
            <div className="ms-address-suggestions-status">
              No matching places.
            </div>
          ) : null}
          <div
            className=" flex flex-col gap-0.75 py-1.5 px-2.5 border-t border-t-border text-(--muted-foreground) text-[0.625rem] leading-[1.35]"
            aria-label="Search attribution"
          >
            {addressCredits.map((credit, index) => (
              <a
                key={`${credit.href}-${index}`}
                href={credit.href}
                target="_blank"
                rel="noreferrer"
                className="text-inherit no-underline hover:text-(--foreground) hover:underline"
              >
                {credit.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {addressSearchOpen && !addressSuggestionsOpen ? (
        <div className="ms-address-search-pop absolute right-0 bottom-[calc(100%+0.375rem)] z-7 flex flex-col items-end gap-1 w-[min(19.375rem,100%)] max-w-full pointer-events-auto">
          {addressSearchStatus ? (
            <span
              className=" max-w-[min(19.375rem,100%)] py-0.75 px-1.75 border border-border rounded-(--radius) bg-(--card) text-(--muted-foreground) text-[0.6875rem] leading-[1.35] text-right [box-shadow:0_0.0625rem_0.25rem_color-mix(in_srgb,var(--foreground)_12%,transparent)] in-[.ms-address-search-pop]:max-w-full"
              role="status"
              data-testid="ms-address-search-status"
            >
              {addressSearchStatus}
            </span>
          ) : null}
          {addressCredits.map((credit, index) => (
            <a
              key={`${credit.href}-${index}`}
              className=" max-w-[min(19.375rem,100%)] py-0.75 px-1.75 border border-border rounded-(--radius) bg-(--card) text-(--muted-foreground) text-[0.6875rem] leading-[1.35] text-right [box-shadow:0_0.0625rem_0.25rem_color-mix(in_srgb,var(--foreground)_12%,transparent)] in-[.ms-address-search-pop]:max-w-full [text-decoration:none] [&:hover]:text-(--foreground) [&:hover]:[text-decoration:underline]"
              href={credit.href}
              target="_blank"
              rel="noreferrer"
              data-testid="ms-address-search-credit"
            >
              {credit.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
