# Metro Maps

An interactive Mapbox GL JS map of Washington, DC Metro routes and stations. Routes are colored by line name, a legend is generated from the route data, and clicking a station shows its name and median sale price.

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
