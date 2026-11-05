<script>
  let { feature, colors, fallbackColor, formatValue } = $props();

  const routeNames = $derived(
    typeof feature.properties?.LINE === "string"
      ? feature.properties.LINE.split(",").map((routeName) => routeName.trim())
      : [],
  );
</script>

<div class="station-popup">
  <h3 class="station-popup-title">{feature.properties?.NAME ?? "Metro station"}</h3>
  <div class="station-popup-routes">
    {#each routeNames as routeName}
      <span class="station-popup-route">
        <span
          class="station-popup-swatch"
          style:background-color={colors[routeName.toLowerCase()] ?? fallbackColor}
          aria-hidden="true"
        ></span>
        <span>{routeName} line</span>
      </span>
    {:else}
      <span class="station-popup-route-unavailable">Lines not available</span>
    {/each}
  </div>
  <hr class="station-popup-divider" />
  <p class="station-popup-price">
    Median home value:
    <span class:home-value={typeof feature.properties?.Median_estimated_home_value === "number"}>
      {formatValue(feature.properties?.Median_estimated_home_value)}
    </span>
  </p>
</div>

<style>
  .station-popup {
    min-width: 190px;
    color: #202a32;
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
  }

  .station-popup-title {
    margin: 0 0 10px;
    font-size: 1rem;
    line-height: 1.3;
  }

  .station-popup-routes {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 12px;
  }

  .station-popup-route {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    line-height: 1.2;
    text-transform: capitalize;
  }

  .station-popup-swatch {
    width: 14px;
    height: 4px;
    flex: 0 0 auto;
    border-radius: 2px;
  }

  .station-popup-route-unavailable {
    color: #56636d;
    font-size: 0.78rem;
  }

  .station-popup-divider {
    height: 0;
    margin: 10px 0;
    border: 0;
    border-top: 1px solid #d5dce1;
  }

  .station-popup-price {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .home-value {
    font-weight: 600;
  }
</style>