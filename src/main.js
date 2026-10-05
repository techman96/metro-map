import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './style.css'

const map = document.getElementById('map')

const mapper = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/shumayl/cmuvqd3gd007x01s1304r56i4',
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  center: [-77.02290934632633, 38.90573345133653],
  zoom: 10
})