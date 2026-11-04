<script module>
  export const routeColors = {
    red: "#BF0D3E",
    orange: "#ED8B00",
    silver: "#8d8d8d",
    blue: "#0072BC",
    yellow: "#FFD100",
    green: "#00B140",
  };
  export const fallbackLineColor = "#6B7280";

  export function formatMedianSalePrice(value) {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : "no sales data";
  }
</script>

<script>
  import { onMount, mount, unmount, flushSync } from "svelte";
  import mapboxgl from "mapbox-gl";
  import { createElement, RotateCcw } from "lucide";
  import StationPopup from "./StationPopup.svelte";

  let { onData } = $props();
  let mapContainer;
  let map;

  const initialView = {
    center: [-77.05, 38.95],
    zoom: 10,
    bearing: 0,
    pitch: 0,
  };

  const lineColorExpression = [
    "match",
    ["get", "NAME"],
    ...Object.entries(routeColors).flat(),
    fallbackLineColor,
  ];

  export function selectStation(feature) {
    map?.flyTo({
      center: feature.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 14),
      duration: 900,
    });
  }

  async function fetchGeoJson(fileName, dataLabel) {
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/dc/${fileName}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${dataLabel}: ${response.status}`);
    }
    return response.json();
  }

  onMount(() => {
    let disposed = false;
    let stationPopup;
    let popupComponent;
    let popupFeatureId;

    function disposePopupContent() {
      if (popupComponent) {
        unmount(popupComponent);
        popupComponent = undefined;
      }
      popupFeatureId = undefined;
    }

    function showStationPopup(feature) {
      if (popupFeatureId === feature.id && stationPopup.isOpen()) return;
      disposePopupContent();

      const popupHost = document.createElement("div");
      popupComponent = mount(StationPopup, {
        target: popupHost,
        props: {
          feature,
          colors: routeColors,
          fallbackColor: fallbackLineColor,
          formatPrice: formatMedianSalePrice,
        },
      });
      flushSync();
      popupFeatureId = feature.id;

      stationPopup
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(popupHost);
      if (!stationPopup.isOpen()) stationPopup.addTo(map);
    }

    map = new mapboxgl.Map({
      container: mapContainer,
      style: "mapbox://styles/shumayl/cmuvqd3gd007x01s1304r56i4",
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      ...initialView,
    });

    const metroDataPromise = Promise.all([
      fetchGeoJson("basic-lines.geojson", "metro lines"),
      fetchGeoJson("dc-stations.geojson", "metro stations"),
    ]);

    metroDataPromise
      .then(([lines, stations]) => {
        if (disposed) return;
        onData(lines.features, stations.features);

        const resetControl = document.createElement("div");
        resetControl.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "reset-view";
        resetButton.title = "Reset to original view";
        resetButton.setAttribute("aria-label", "Reset to original view");
        const resetIcon = createElement(RotateCcw, {
          width: 18,
          height: 18,
          "aria-hidden": "true",
        });
        resetButton.append(resetIcon);
        resetButton.addEventListener("click", () => {
          map.flyTo({
            ...initialView,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            duration: 900,
          });
        });
        resetControl.append(resetButton);

        map.addControl(
          {
            onAdd() {
              return resetControl;
            },
            onRemove() {
              resetControl.remove();
            },
          },
          "top-right",
        );
      })
      .catch((error) => {
        if (disposed) return;
        console.error("Failed to load metro data:", error);
      });

    map.on("error", (event) => {
      console.error("Mapbox error:", event.error);
    });

    map.on("load", async () => {
      try {
        const [lines, stations] = await metroDataPromise;
        if (disposed) return;

        map.addSource("metro-lines", {
          type: "geojson",
          data: lines,
        });

        map.addLayer({
          id: "main-metro-lines",
          type: "line",
          source: "metro-lines",
          paint: {
            "line-color": lineColorExpression,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              10, 5, 14, 3.5, 16, 3,
            ],
          },
        });

        map.addSource("metro-stations", {
          type: "geojson",
          data: stations,
        });

        map.addLayer({
          id: "main-metro-stations",
          type: "circle",
          source: "metro-stations",
          paint: {
            "circle-color": "#ffffff",
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 4, 14, 3.5, 16, 3,
            ],
            "circle-stroke-color": "#202020",
            "circle-stroke-width": 1.5,
          },
        });

        stationPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
        });
        stationPopup.on("close", disposePopupContent);

        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          map.on("mousemove", "main-metro-stations", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;

            showStationPopup(feature);
          });

          map.on("mouseenter", "main-metro-stations", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "main-metro-stations", () => {
            map.getCanvas().style.cursor = "";
            stationPopup.remove();
          });
        } else {
          map.on("click", "main-metro-stations", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;

            showStationPopup(feature);
          });
        }
      } catch (error) {
        if (disposed) return;
        console.error("Failed to load metro data:", error);
      }
    });

    return () => {
      disposed = true;
      stationPopup?.remove();
      disposePopupContent();
      map.remove();
    };
  });
</script>

<div id="map" class="map" bind:this={mapContainer}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .map :global(.mapboxgl-ctrl-group .reset-view) {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    color: #202a32;
  }

  .map :global(.reset-view:focus-visible) {
    outline: 2px solid #087eae;
    outline-offset: 2px;
  }
</style>