# Metro Maps

An interactive Washington, DC Metro map built with Svelte 5, Vite, and Mapbox GL JS. Routes are colored by line name. Station popups show served lines and median sale price on hover, with tap support on touch devices. Search selects a station and flies to it; a separate reset button restores the original map view. The generated route legend is currently hidden.

## Application structure

Station search supports Arrow Down/Up to highlight results, Enter to select the highlighted result (or the first match), and Escape or Tab to dismiss the list. Focus remains in the input during arrow-key navigation, and highlighted results scroll into view.

- `index.html`: page metadata and Svelte mount target.
- `src/entry.js`: mounts the Svelte app and imports the stylesheets.
- `src/App.svelte`: reactive search, results, selected-station details, clear button, hidden legend, and their scoped styles. The compact search panel sits at the bottom on mobile.
- `src/Map.svelte`: Mapbox initialization, data loading, layers, popups, camera movement, reset control, and map styles. The map is created in `onMount` and removed when the component unmounts. Shared route colors and the price formatter are module exports used by `App.svelte`.
- `src/StationPopup.svelte`: station name, served-line swatches, divider, median sale price, and scoped popup styles. Mapbox hosts the component; it is unmounted on popup close, station change, or map teardown.
- `src/style.css`: global typography, box sizing, and document sizing. Mapbox's package stylesheet is imported separately by `src/entry.js`.
- `vite.config.js`: Svelte plugin and relative deployment base path.

The project uses Svelte with Vite, not SvelteKit. The GeoJSON files and GitHub Pages deployment workflow remain unchanged by the migration.

## Requirements

- Node.js 22
- npm
- A Mapbox public access token

## Run locally

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and set `VITE_MAPBOX_ACCESS_TOKEN` to your Mapbox public token. Do not commit `.env`; it is ignored by Git.
3. Start the development server:

   ```sh
   npm run dev
   ```

4. Create a production build:

   ```sh
   npm run build
   ```

The production site is written to `dist/`.

## Data files

The app currently loads these files from `public/data/dc/`:

- `basic-lines.geojson`: route `LineString` features; the `NAME` property identifies each route.
- `dc-stations.geojson`: station `Point` features; the `NAME`, `LINE`, and `median_sale_price` properties are used by the map and popups.

GeoJSON point coordinates must be in `[longitude, latitude]` order. The station file currently contains 96 points, and its geometry coordinates were checked against its `longitude` and `latitude` properties.

The station GeoJSON was exported from the project station CSV using ArcGIS Pro. The route file contains WMATA route metadata. Record the original source URL and attribution for the station CSV here before public release; its properties include addresses and aggregated real-estate values and sales statistics for 2025-10-01 through 2026-09-30.

## Convert station CSV with ArcGIS Pro

1. Add the station CSV to an ArcGIS Pro map.
2. Run **XY Table To Point**.
3. Choose `longitude` for **X Field** and `latitude` for **Y Field**.
4. Set the coordinate system to **GCS WGS 1984** and run the tool.
5. Check that the output points appear in the expected locations.
6. Run **Features To JSON** on that point layer and enable **Output to GeoJSON**.
7. Save the result as `public/data/dc/dc-stations.geojson`.

If ArcGIS warns that an output feature class already exists, choose a new output name or enable overwrite only when you intend to replace the old output.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow builds the app and deploys `dist/` to GitHub Pages when changes are pushed to `main`.

1. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
2. Add a repository Actions secret named `VITE_MAPBOX_ACCESS_TOKEN` with the Mapbox public token. Never put the token value in this README or commit it to the repository.
3. Push changes to `main` and check the **Actions** tab for a successful deployment.
4. Restrict the Mapbox token to the deployed site URL in the Mapbox account settings.

Vite is configured with a relative base path for GitHub Pages project sites, and the data requests use `import.meta.env.BASE_URL` so they work under the repository subpath.
