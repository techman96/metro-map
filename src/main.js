import mapboxgl from "mapbox-gl";
import { createElement, RotateCcw } from "lucide";

export const routeColors = {
  red: "#BF0D3E",
  orange: "#ED8B00",
  silver: "#8d8d8d",
  blue: "#0072BC",
  yellow: "#FFD100",
  green: "#00B140",
};
export const fallbackLineColor = "#6B7280";

const lineColorExpression = [
  "match",
  ["get", "NAME"],
  ...Object.entries(routeColors).flat(),
  fallbackLineColor,
];

function createStationPopupContent(feature) {
  const popupContent = document.createElement("div");
  popupContent.className = "station-popup";

  const stationName = document.createElement("h3");
  stationName.className = "station-popup-title";
  stationName.textContent = feature.properties?.NAME ?? "Metro station";

  const routeList = document.createElement("div");
  routeList.className = "station-popup-routes";

  const routeNames =
    typeof feature.properties?.LINE === "string"
      ? feature.properties.LINE.split(",").map((routeName) => routeName.trim())
      : [];

  for (const routeName of routeNames) {
    const route = document.createElement("span");
    route.className = "station-popup-route";

    const swatch = document.createElement("span");
    swatch.className = "station-popup-swatch";
    swatch.style.backgroundColor =
      routeColors[routeName.toLowerCase()] ?? fallbackLineColor;
    swatch.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = `${routeName} line`;

    route.append(swatch, label);
    routeList.append(route);
  }

  if (routeNames.length === 0) {
    const unavailable = document.createElement("span");
    unavailable.className = "station-popup-route-unavailable";
    unavailable.textContent = "Lines not available";
    routeList.append(unavailable);
  }

  const divider = document.createElement("hr");
  divider.className = "station-popup-divider";

  const salePrice = document.createElement("p");
  salePrice.className = "station-popup-price";
  salePrice.textContent = `Median sale price: ${formatMedianSalePrice(
    feature.properties?.median_sale_price,
  )}`;

  popupContent.append(stationName, routeList, divider, salePrice);
  return popupContent;
}

export function formatMedianSalePrice(value) {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)
    : "no sales data";
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

const initialView = {
  center: [-77.05, 38.95],
  zoom: 10,
  bearing: 0,
  pitch: 0,
};

export function createMetroMap(mapContainer, onData) {
  let disposed = false;
  let stationPopup;
  const map = new mapboxgl.Map({
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
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            5,
            14,
            3.5,
            16,
            3,
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
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            4,
            14,
            3.5,
            16,
            3,
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

      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        map.on("mousemove", "main-metro-stations", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;

          stationPopup
            .setLngLat(feature.geometry.coordinates)
            .setDOMContent(createStationPopupContent(feature))
            .addTo(map);
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

          stationPopup
            .setLngLat(feature.geometry.coordinates)
            .setDOMContent(createStationPopupContent(feature))
            .addTo(map);
        });
      }
    } catch (error) {
      if (disposed) return;
      console.error("Failed to load metro data:", error);
    }
  });

  return {
    selectStation(feature) {
      map.flyTo({
        center: feature.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 14),
        duration: 900,
      });
    },
    destroy() {
      disposed = true;
      stationPopup?.remove();
      map.remove();
    },
  };
}
