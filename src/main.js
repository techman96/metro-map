import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

const mapContainer = document.getElementById("map");
const legendContainer = document.getElementById("legend");
const sidebar = document.querySelector(".sidebar");
const stationSearchInput = document.getElementById("station-search");
const clearStationSearchButton = document.getElementById(
  "clear-station-search",
);
const stationResults = document.getElementById("station-results");
const stationDetails = document.getElementById("station-details");

const routeColors = {
  red: "#BF0D3E",
  orange: "#ED8B00",
  silver: "#8d8d8d",
  blue: "#0072BC",
  yellow: "#FFD100",
  green: "#00B140",
};
const fallbackLineColor = "#6B7280";

const lineColorExpression = [
  "match",
  ["get", "NAME"],
  ...Object.entries(routeColors).flat(),
  fallbackLineColor,
];

function renderLineLegend(features) {
  const title = document.createElement("h2");
  title.className = "legend-title";
  title.textContent = "Routes";

  const list = document.createElement("ul");
  list.className = "legend-list";

  const routeNames = [
    ...new Set(
      features
        .map((feature) => feature.properties?.NAME)
        .filter((name) => typeof name === "string" && name.length > 0)
        .sort(),
    ),
  ];

  for (const routeName of routeNames) {
    const item = document.createElement("li");
    item.className = "legend-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = routeColors[routeName] ?? fallbackLineColor;
    swatch.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = `${routeName[0].toUpperCase()}${routeName.slice(1)}`;

    item.append(swatch, label);
    list.append(item);
  }

  legendContainer.replaceChildren(title, list);
}

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

function formatMedianSalePrice(value) {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)
    : "no sales data";
}

function renderStationDetails(feature) {
  const heading = document.createElement("h2");
  heading.className = "station-details-title";
  heading.textContent = feature.properties?.NAME ?? "Metro station";

  const lines = document.createElement("p");
  lines.className = "station-details-lines";
  lines.textContent = `Lines: ${feature.properties?.LINE ?? "Not available"}`;

  const salePrice = document.createElement("p");
  salePrice.className = "station-details-price";
  salePrice.textContent = `Median sale price: ${formatMedianSalePrice(
    feature.properties?.median_sale_price,
  )}`;

  stationDetails.replaceChildren(heading, lines, salePrice);
}

function updateSidebarExpanded() {
  sidebar.classList.toggle(
    "is-expanded",
    !stationResults.hidden || stationDetails.childElementCount > 0,
  );
}

function updateClearSearchButton() {
  clearStationSearchButton.hidden = stationSearchInput.value.length === 0;
}

function renderStationResults(stations, query) {
  const searchTerm = query.trim().toLocaleLowerCase();
  stationResults.replaceChildren();

  if (!searchTerm) {
    stationResults.hidden = true;
    stationSearchInput.setAttribute("aria-expanded", "false");
    updateSidebarExpanded();
    return;
  }

  const matches = stations
    .filter((feature) =>
      feature.properties?.NAME?.toLocaleLowerCase().includes(searchTerm),
    )
    .slice(0, 8);

  if (matches.length === 0) {
    const emptyResult = document.createElement("li");
    emptyResult.className = "station-no-results";
    emptyResult.textContent = "No stations found";
    stationResults.append(emptyResult);
  } else {
    for (const feature of matches) {
      const item = document.createElement("li");
      const result = document.createElement("button");
      result.className = "station-result";
      result.type = "button";
      result.textContent = feature.properties.NAME;
      result.addEventListener("click", () => {
        stationSearchInput.value = feature.properties.NAME;
        updateClearSearchButton();
        stationResults.hidden = true;
        stationSearchInput.setAttribute("aria-expanded", "false");
        renderStationDetails(feature);
        updateSidebarExpanded();
        map.flyTo({
          center: feature.geometry.coordinates,
          zoom: Math.max(map.getZoom(), 14),
          duration: 900,
        });
      });
      item.append(result);
      stationResults.append(item);
    }
  }

  stationResults.hidden = false;
  stationSearchInput.setAttribute("aria-expanded", "true");
  updateSidebarExpanded();
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

const map = new mapboxgl.Map({
  container: mapContainer,
  style: "mapbox://styles/shumayl/cmuvqd3gd007x01s1304r56i4",
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  center: [-77.05, 38.95],
  zoom: 10,
});

const metroDataPromise = Promise.all([
  fetchGeoJson("basic-lines.geojson", "metro lines"),
  fetchGeoJson("dc-stations.geojson", "metro stations"),
]);

metroDataPromise
  .then(([, stations]) => {
    stationSearchInput.addEventListener("input", () => {
      renderStationResults(stations.features, stationSearchInput.value);
      updateClearSearchButton();
    });

    clearStationSearchButton.addEventListener("click", () => {
      stationSearchInput.value = "";
      stationResults.replaceChildren();
      stationResults.hidden = true;
      stationDetails.replaceChildren();
      stationSearchInput.setAttribute("aria-expanded", "false");
      updateClearSearchButton();
      updateSidebarExpanded();
      stationSearchInput.focus();
    });

    stationSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        stationResults.hidden = true;
        stationSearchInput.setAttribute("aria-expanded", "false");
        updateSidebarExpanded();
      }
    });
  })
  .catch((error) => {
    console.error("Failed to load metro data:", error);
  });

map.on("error", (event) => {
  console.error("Mapbox error:", event.error);
});

map.on("load", async () => {
  try {
    const [lines, stations] = await metroDataPromise;
    renderLineLegend(lines.features);

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
        "line-width": 5,
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
        "circle-radius": 4,
        "circle-stroke-color": "#202020",
        "circle-stroke-width": 1.5,
      },
    });

    const stationPopup = new mapboxgl.Popup({
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
    console.error("Failed to load metro data:", error);
  }
});
