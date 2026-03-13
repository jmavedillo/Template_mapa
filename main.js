import './styles.css';
import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_STYLE = 'Liberty';
const DEFAULT_DETAIL_LEVEL = 'Closer';

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: -0.35,
  Closer: 0.45,
  'Very Close': 1.1,
};

const OPENFREEMAP_STYLES = {
  Liberty: 'https://tiles.openfreemap.org/styles/liberty',
  Positron: 'https://tiles.openfreemap.org/styles/positron',
  Bright: 'https://tiles.openfreemap.org/styles/bright',
  // Future custom style insertion point:
  // Replace a hosted OpenFreeMap URL above with your own Maputnik-edited style JSON URL.
  // Example: 'Custom': 'https://your-domain.example.com/styles/poster-style.json',
};

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, display_name: 'Madrid, Spain', addresstype: 'city' },
  'Paris, France': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, France', addresstype: 'city' },
};

const placeInput = document.querySelector('#place-input');
const styleSelect = document.querySelector('#theme-select');
const detailSelect = document.querySelector('#detail-select');
const updateBtn = document.querySelector('#update-btn');
const posterTitle = document.querySelector('#poster-title');

let map;
let centerMarker;

function chooseZoomForPlace(result, detailLevel) {
  const broadAreaTypes = new Set(['country', 'state', 'region', 'county']);
  const neighborhoodTypes = new Set(['suburb', 'neighbourhood', 'quarter', 'district']);
  const cityTypes = new Set(['city', 'town', 'village', 'municipality']);
  const poiTypes = new Set(['house', 'building', 'amenity', 'office', 'retail', 'shop', 'tourism', 'attraction', 'school', 'university', 'hospital']);

  const type = (result.addresstype || result.type || '').toLowerCase();
  const klass = (result.class || '').toLowerCase();

  let baseZoom = 15;

  if (poiTypes.has(type) || klass === 'amenity' || klass === 'shop' || klass === 'tourism') {
    baseZoom = 17.2;
  } else if (type.includes('road') || klass === 'highway' || type === 'street') {
    baseZoom = 16.5;
  } else if (neighborhoodTypes.has(type)) {
    baseZoom = 16;
  } else if (cityTypes.has(type)) {
    baseZoom = 14.8;
  } else if (broadAreaTypes.has(type)) {
    baseZoom = 13.1;
  }

  if (result.boundingbox?.length === 4) {
    const [south, north, west, east] = result.boundingbox.map(Number);
    const span = Math.max(Math.abs(north - south), Math.abs(east - west));

    if (Number.isFinite(span)) {
      if (span < 0.01) baseZoom = Math.max(baseZoom, 17.3);
      else if (span < 0.03) baseZoom = Math.max(baseZoom, 16.7);
      else if (span < 0.08) baseZoom = Math.max(baseZoom, 16.1);
      else if (span < 0.2) baseZoom = Math.max(baseZoom, 15.4);
      else if (span < 0.45) baseZoom = Math.max(baseZoom, 14.7);
      else if (span < 0.9) baseZoom = Math.max(baseZoom, 14.1);
      else baseZoom = Math.max(baseZoom, 13.2);
    }
  }

  if (baseZoom <= 13.4) {
    console.debug('[Geocode] Broad result received; forcing closer urban zoom.', {
      queryType: type,
      class: klass,
      placeRank: result.place_rank,
      bbox: result.boundingbox,
      chosenBaseZoom: baseZoom,
    });
  }

  const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
  return Math.max(13, Math.min(19, baseZoom + offset));
}

function ensureHeartMarker(lngLat) {
  if (!centerMarker) {
    const markerEl = document.createElement('div');
    markerEl.className = 'heart-marker';
    markerEl.textContent = '❤';

    centerMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' }).setLngLat(lngLat).addTo(map);
    return;
  }

  centerMarker.setLngLat(lngLat);
}

async function geocodePlace(query) {
  if (EXAMPLE_LOCATIONS[query]) return EXAMPLE_LOCATIONS[query];

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  endpoint.searchParams.set('addressdetails', '1');

  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Geocoding failed (${response.status}).`);

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('No place found. Try a street, neighborhood, or address.');
  }

  return results[0];
}

async function updatePosterLocation(query) {
  const target = query.trim() || DEFAULT_PLACE;
  updateBtn.disabled = true;
  updateBtn.textContent = 'Updating...';

  try {
    const result = await geocodePlace(target);
    const lng = Number(result.lon);
    const lat = Number(result.lat);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Invalid coordinates received from geocoder.');

    const zoom = chooseZoomForPlace(result, detailSelect.value);
    const lngLat = [lng, lat];

    map.easeTo({ center: lngLat, zoom, duration: 700 });
    ensureHeartMarker(lngLat);
    posterTitle.textContent = result.display_name || target;
  } catch (error) {
    posterTitle.textContent = `Place not found: ${target}`;
    console.error(error);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = 'Update poster';
  }
}

function applySelectedStyle(styleName) {
  const styleUrl = OPENFREEMAP_STYLES[styleName] ?? OPENFREEMAP_STYLES[DEFAULT_STYLE];

  // Future customization point:
  // swap `styleUrl` with your own hosted style JSON URL from Maputnik or another style pipeline.
  map.setStyle(styleUrl);
}

function boot() {
  styleSelect.value = DEFAULT_STYLE;
  detailSelect.value = DEFAULT_DETAIL_LEVEL;

  map = new maplibregl.Map({
    container: 'map',
    style: OPENFREEMAP_STYLES[DEFAULT_STYLE],
    center: [EXAMPLE_LOCATIONS[DEFAULT_PLACE].lon, EXAMPLE_LOCATIONS[DEFAULT_PLACE].lat],
    zoom: chooseZoomForPlace(EXAMPLE_LOCATIONS[DEFAULT_PLACE], DEFAULT_DETAIL_LEVEL),
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    ensureHeartMarker([EXAMPLE_LOCATIONS[DEFAULT_PLACE].lon, EXAMPLE_LOCATIONS[DEFAULT_PLACE].lat]);
  });

  styleSelect.addEventListener('change', (event) => applySelectedStyle(event.target.value));
  detailSelect.addEventListener('change', () => updatePosterLocation(placeInput.value));
  updateBtn.addEventListener('click', () => updatePosterLocation(placeInput.value));
  placeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') updatePosterLocation(placeInput.value);
  });
}

boot();
