import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

const mapContainer = document.getElementById("map");
const legendContainer = document.getElementById("legend");

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
  "fallbackLineColor",
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
        .filter((name) => typeof name === "string" && name.length > 0),
    ),
  ].sort();

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

const map = new mapboxgl.Map({
  container: mapContainer,
  style: "mapbox://styles/shumayl/cmuvqd3gd007x01s1304r56i4",
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  center: [-77.05, 38.95],
  zoom: 10,
});

map.on("load", async () => {
  try {
    const response = await fetch("/data/dc/basic-lines.geojson");
    const stationResponse = await fetch("/data/dc/stations.geojson");
    if (!response.ok) {
      throw new Error(`Failed to load metro lines: ${response.status}`);
    }
    if (!stationResponse.ok) {
      throw new Error(
        `Failed to load metro stations: ${stationResponse.status}`,
      );
    }

    const lines = await response.json();
    const stations = await stationResponse.json();

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
        "line-width": 3,
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
  } catch (error) {
    console.error("Failed to load metro data:", error);
  }
});
