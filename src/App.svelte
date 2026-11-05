<script>
  import { tick } from "svelte";
  import Map, {
    routeColors,
    fallbackLineColor,
    formatMedianSalePrice,
  } from "./Map.svelte";

  let searchInput;
  let resultsList;
  let mapComponent;
  let query = $state("");
  let stations = $state.raw([]);
  let lineFeatures = $state.raw([]);
  let selectedStation = $state.raw(null);
  let resultsDismissed = $state(false);
  let activeResultIndex = $state(-1);

  const searchTerm = $derived(query.trim().toLocaleLowerCase());
  const showResults = $derived(searchTerm.length > 0 && !resultsDismissed);
  const expanded = $derived(showResults || selectedStation !== null);
  const matches = $derived(
    stations
      .filter((feature) =>
        feature.properties?.NAME?.toLocaleLowerCase().includes(searchTerm),
      )
      .slice(0, 8),
  );
  const routeNames = $derived(
    [...new Set(lineFeatures
      .map((feature) => feature.properties?.NAME)
      .filter((name) => typeof name === "string" && name.length > 0))].sort(),
  );

  const activeResultId = $derived(
    showResults && matches[activeResultIndex]
      ? `station-option-${matches[activeResultIndex].id}`
      : undefined,
  );

  function handleSearchInput() {
    resultsDismissed = false;
    activeResultIndex = -1;
  }

  async function handleSearchKeydown(event) {
    if (event.isComposing) return;

    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      resultsDismissed = true;
      activeResultIndex = -1;
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!searchTerm || matches.length === 0) return;
      event.preventDefault();
      const previousIndex = resultsDismissed ? -1 : activeResultIndex;
      resultsDismissed = false;
      if (event.key === "ArrowDown") {
        activeResultIndex = (previousIndex + 1) % matches.length;
      } else {
        activeResultIndex = previousIndex <= 0
          ? matches.length - 1
          : previousIndex - 1;
      }
      await tick();
      resultsList?.querySelectorAll('[role="option"]')[activeResultIndex]
        ?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter" && showResults && matches.length > 0) {
      event.preventDefault();
      selectStation(matches[activeResultIndex >= 0 ? activeResultIndex : 0]);
    }
  }

  function selectStation(feature) {
    query = feature.properties.NAME;
    resultsDismissed = true;
    activeResultIndex = -1;
    selectedStation = feature;
    mapComponent.selectStation(feature);
  }

  function clearSearch() {
    query = "";
    resultsDismissed = false;
    activeResultIndex = -1;
    selectedStation = null;
    searchInput.focus();
  }
</script>

<main class="map-shell" aria-label="Washington, DC Metro map">
  <Map
    bind:this={mapComponent}
    onData={(loadedLines, loadedStations) => {
      lineFeatures = loadedLines;
      stations = loadedStations;
    }}
  />
  <aside class="sidebar" class:is-expanded={expanded} aria-label="Metro map panel">
    <div class="station-search" role="search">
      <label class="visually-hidden" for="station-search">Search stations</label>
      <div class="station-search-field">
        <input
          id="station-search"
          type="search"
          role="combobox"
          placeholder="Search stations"
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-activedescendant={activeResultId}
          aria-controls="station-results"
          bind:this={searchInput}
          bind:value={query}
          oninput={handleSearchInput}
          onkeydown={handleSearchKeydown}
        />
        <button
          id="clear-station-search"
          class="clear-search"
          type="button"
          aria-label="Clear station search"
          title="Clear search"
          hidden={query.length === 0}
          onclick={clearSearch}
        >&times;</button>
      </div>
    </div>

    <ul
      id="station-results"
      class="station-results"
      role="listbox"
      bind:this={resultsList}
      aria-label="Station search results"
      aria-live="polite"
      hidden={!showResults}
    >
      {#if showResults}
        {#each matches as feature, resultIndex (feature.id)}
          <li role="presentation">
            <button
              id={`station-option-${feature.id}`}
              class="station-result"
              class:is-active={activeResultIndex === resultIndex}
              type="button"
              role="option"
              aria-selected={activeResultIndex === resultIndex}
              tabindex="-1"
              onmousedown={(event) => event.preventDefault()}
              onclick={() => selectStation(feature)}
            >{feature.properties.NAME}</button>
          </li>
        {:else}
          <li class="station-no-results" role="presentation">No stations found</li>
        {/each}
      {/if}
    </ul>

    <section
      id="station-details"
      class="station-details"
      aria-label="Selected station details"
      aria-live="polite"
      hidden={!selectedStation}
    >
      {#if selectedStation}
        <h2 class="station-details-title">{selectedStation.properties.NAME ?? "Metro station"}</h2>
        <p class="station-details-lines">Lines: {selectedStation.properties.LINE ?? "Not available"}</p>
        <p class="station-details-price">Median home value: {formatMedianSalePrice(selectedStation.properties.median_sale_price)}</p>
      {/if}
    </section>

    <section class="legend-section" aria-label="Metro routes">
      <div id="legend" class="legend" aria-label="Metro route legend">
        <h2 class="legend-title">Routes</h2>
        <ul class="legend-list">
          {#each routeNames as routeName (routeName)}
            <li class="legend-item">
              <span
                class="legend-swatch"
                style:background-color={routeColors[routeName] ?? fallbackLineColor}
                aria-hidden="true"
              ></span>
              <span>{routeName[0].toUpperCase()}{routeName.slice(1)}</span>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  </aside>
</main>

<style>
  .map-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  .sidebar {
    position: absolute;
    z-index: 2;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: min(380px, calc(100vw - 24px));
    min-height: 0;
    max-height: calc(100dvh - 24px);
    padding: 8px;
    overflow: hidden;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
  }

  .sidebar.is-expanded {
    gap: 8px;
    background: rgba(248, 250, 251, 0.97);
    border-color: rgba(255, 255, 255, 0.75);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  }

  .station-search-field {
    position: relative;
  }

  .station-search input {
    width: 100%;
    height: 48px;
    padding: 0 44px 0 12px;
    color: #202a32;
    font: inherit;
    background: #fff;
    border: 1px solid #c8d0d6;
    border-radius: 8px;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.2);
  }

  .station-search input::-webkit-search-cancel-button {
    appearance: none;
  }

  .clear-search {
    position: absolute;
    top: 50%;
    right: 7px;
    display: grid;
    width: 32px;
    height: 32px;
    padding: 0;
    place-items: center;
    color: #53616a;
    font: inherit;
    font-size: 1.35rem;
    line-height: 1;
    background: transparent;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    transform: translateY(-50%);
  }

  .clear-search:hover,
  .clear-search:focus-visible {
    color: #15252f;
    background: #e7edf0;
    outline: none;
  }

  .clear-search[hidden] {
    display: none;
  }

  .sidebar.is-expanded .station-search input {
    box-shadow: none;
  }

  .station-search input:focus-visible {
    border-color: #087eae;
    outline: 2px solid #087eae;
    outline-offset: 2px;
  }

  .station-results {
    display: grid;
    gap: 2px;
    max-height: min(40vh, 320px);
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .station-results[hidden] {
    display: none;
  }

  .station-no-results {
    padding: 10px;
    color: #56636d;
    font-size: 0.9rem;
  }

  .station-result {
    width: 100%;
    padding: 9px 10px;
    color: inherit;
    font: inherit;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 3px;
    cursor: pointer;
  }

  .station-result:hover,
  .station-result.is-active,
  .station-result:focus-visible {
    color: #123745;
    background: #eebfab;
    box-shadow: inset 3px 0 0 #ee4800;
    outline: none;
  }

  .station-details {
    min-height: 0;
    overflow-y: auto;
    border-top: 1px solid #d5dce1;
  }

  .station-details-title {
    margin: 10px 0 6px;
    font-size: 1rem;
    line-height: 1.3;
  }

  .station-details p {
    margin: 4px 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .station-details:empty {
    display: none;
  }

  .legend-section {
    display: none;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #d5dce1;
  }

  .legend {
    display: grid;
    gap: 0.5rem;
    max-height: 100%;
    overflow-y: auto;
  }

  .legend-title {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.2;
  }

  .legend-list {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    line-height: 1.2;
  }

  .legend-swatch {
    width: 1.25rem;
    height: 0.22rem;
    flex: 0 0 auto;
    border-radius: 2px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 600px) {
    .sidebar {
      top: auto;
      bottom: max(8px, env(safe-area-inset-bottom));
      left: 8px;
      width: calc(100vw - 16px);
      max-height: 70dvh;
    }

    .station-results {
      max-height: 32dvh;
    }
  }
</style>