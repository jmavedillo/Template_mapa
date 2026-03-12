import L from 'leaflet';
import './styles.css';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_ZOOM = 13;

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, zoom: 13 },
  'Paris, France': { lat: 48.8566, lon: 2.3522, zoom: 13 },
};

const placeInput = document.querySelector('#place-input');
const updateBtn = document.querySelector('#update-btn');
const posterTitle = document.querySelector('#poster-title');

let map;
let centerMarker;

/**
 * Map adapter: isolated so swapping Leaflet -> MapLibre later is easy.
 * TODO(MapLibre): replace this function with a MapLibre map initializer.
 */
function initializeMapEngine(containerId, initialView) {
  const mapInstance = L.map(containerId, {
    zoomControl: false,
    attributionControl: true,
  }).setView([initialView.lat, initialView.lon], initialView.zoom ?? DEFAULT_ZOOM);

  // Minimal monochrome base map for decorative poster style.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(mapInstance);

  return mapInstance;
}

function createCenterMarker(lat, lon) {
  const icon = L.divIcon({
    className: 'heart-marker',
    html: '❤',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });

  return L.marker([lat, lon], { icon, keyboard: false, interactive: false });
}

/**
 * TODO(Geocoding): swap Nominatim for a paid geocoding provider when needed.
 */
async function geocodePlace(query) {
  if (EXAMPLE_LOCATIONS[query]) {
    return EXAMPLE_LOCATIONS[query];
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Geocoding lookup failed.');
  }

  const data = await response.json();

  if (!data.length) {
    throw new Error('No place found. Try a larger city name.');
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    zoom: DEFAULT_ZOOM,
  };
}

/**
 * Encapsulated location update logic.
 * TODO(Export): integrate high-resolution poster export from this update state.
 */
async function updatePosterLocation(query) {
  const target = query.trim() || DEFAULT_PLACE;

  updateBtn.disabled = true;
  updateBtn.textContent = 'Updating...';

  try {
    const location = await geocodePlace(target);

    map.setView([location.lat, location.lon], location.zoom ?? DEFAULT_ZOOM, {
      animate: true,
      duration: 0.8,
    });

    if (centerMarker) {
      centerMarker.remove();
    }

    centerMarker = createCenterMarker(location.lat, location.lon).addTo(map);
    posterTitle.textContent = target;
  } catch (error) {
    posterTitle.textContent = `Place not found: ${target}`;
    console.error(error);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = 'Update poster';
  }
}

function boot() {
  const initialView = EXAMPLE_LOCATIONS[DEFAULT_PLACE];
  map = initializeMapEngine('map', initialView);
  centerMarker = createCenterMarker(initialView.lat, initialView.lon).addTo(map);

  updateBtn.addEventListener('click', () => updatePosterLocation(placeInput.value));
  placeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updatePosterLocation(placeInput.value);
    }
  });
}

boot();
