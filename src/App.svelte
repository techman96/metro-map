<script>
  import { onMount } from "svelte";
  import {
    createMetroMap,
    routeColors,
    fallbackLineColor,
    formatMedianSalePrice,
  } from "./main.js";

  let mapContainer;
  let searchInput;
  let mapController;
  let query = $state("");
  let stations = $state.raw([]);
  let lineFeatures = $state.raw([]);
  let selectedStation = $state.raw(null);
  let resultsDismissed = $state(false);

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

  onMount(() => {
    mapController = createMetroMap(mapContainer, (loadedLines, loadedStations) => {
      lineFeatures = loadedLines;
      stations = loadedStations;
    });
    return () => mapController.destroy();
  });

  function selectStation(feature) {
    query = feature.properties.NAME;
    resultsDismissed = true;
    selectedStation = feature;
    mapController.selectStation(feature);
  }

  function clearSearch() {
    query = "";
    resultsDismissed = false;
    selectedStation = null;
    searchInput.focus();
  }
</script>

<main class="map-shell" aria-label="Washington, DC Metro map">
  <div id="map" class="map" bind:this={mapContainer}></div>
  <aside class="sidebar" class:is-expanded={expanded} aria-label="Metro map panel">
    <div class="station-search" role="search">
      <label class="visually-hidden" for="station-search">Search stations</label>
      <div class="station-search-field">
        <input
          id="station-search"
          type="search"
          placeholder="Search stations"
          autocomplete="off"
          aria-autocomplete="list"
          aria-controls="station-results"
          bind:this={searchInput}
          bind:value={query}
          oninput={() => resultsDismissed = false}
          onkeydown={(event) => {
            if (event.key === "Escape") resultsDismissed = true;
          }}
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
      aria-label="Station search results"
      aria-live="polite"
      hidden={!showResults}
    >
      {#if showResults}
        {#each matches as feature (feature.id)}
          <li>
            <button
              class="station-result"
              type="button"
              onclick={() => selectStation(feature)}
            >{feature.properties.NAME}</button>
          </li>
        {:else}
          <li class="station-no-results">No stations found</li>
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
        <p class="station-details-price">Median sale price: {formatMedianSalePrice(selectedStation.properties.median_sale_price)}</p>
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