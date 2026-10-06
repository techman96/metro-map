import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

const mapContainer = document.getElementById("map");

const map = new mapboxgl.Map({
  container: mapContainer,
  style: "mapbox://styles/shumayl/cmuvqd3gd007x01s1304r56i4",
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  center: [-77.02290934632633, 38.90573345133653],
  zoom: 10,
});

map.on("load", async () => {
  try {
    const response = await fetch("/data/dc/lines.geojson");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const lines = await response.json();
    map.addSource("metro-lines", {
      type: "geojson",
      data: lines,
    });

    map.addLayer({
      id: "metro-lines-layer",
      type: "line",
      source: "metro-lines",
      paint: {
        "line-color": "#e53935",
        "line-width": 3,
      },
    });
  } catch (error) {
    console.error("Failed to load metro lines:", error);
  }
});
