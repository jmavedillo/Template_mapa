import L from 'leaflet';
import './styles.css';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_THEME = 'Warm Coral';
const DEFAULT_ZOOM = 13;

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, zoom: 13 },
  'Paris, France': { lat: 48.8566, lon: 2.3522, zoom: 13 },
};

const THEME_CONFIG = {
  'Soft Blue': {
    tile: {
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      options: {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    cssVars: {
      '--page-bg': '#edf3fa',
      '--page-accent-a': '#f6f9fd',
      '--page-accent-b': '#dde8f5',
      '--poster-bg': '#f8fbff',
      '--poster-border': '#c4d4e8',
      '--frame-bg': '#f4f8fd',
      '--frame-inner': '#e8f1fb',
      '--frame-border': '#b8cde5',
      '--text-main': '#1e2b3d',
      '--text-muted': '#4b5f7a',
      '--control-bg': '#fafdff',
      '--control-border': '#b9cce2',
      '--map-filter': 'saturate(1.1) contrast(1.18) brightness(1.03)',
      '--marker-color': '#1c4f86',
      '--attribution-bg': 'rgba(237, 246, 255, 0.72)',
      '--attribution-color': '#274261',
    },
  },
  'Warm Coral': {
    tile: {
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      options: {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    cssVars: {
      '--page-bg': '#f5ece6',
      '--page-accent-a': '#fbf5f1',
      '--page-accent-b': '#efd7cc',
      '--poster-bg': '#fff8f2',
      '--poster-border': '#dbc2b3',
      '--frame-bg': '#fff7f0',
      '--frame-inner': '#f7e6dc',
      '--frame-border': '#d5b2a0',
      '--text-main': '#3b2420',
      '--text-muted': '#7a524a',
      '--control-bg': '#fffcf8',
      '--control-border': '#d4b9a9',
      '--map-filter': 'sepia(0.28) saturate(1.35) hue-rotate(-12deg) contrast(1.17) brightness(1.03)',
      '--marker-color': '#9d3f30',
      '--attribution-bg': 'rgba(255, 246, 238, 0.74)',
      '--attribution-color': '#5e342d',
    },
  },
  'Mono Light': {
    tile: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    cssVars: {
      '--page-bg': '#f0f0f0',
      '--page-accent-a': '#ffffff',
      '--page-accent-b': '#dddddd',
      '--poster-bg': '#fafafa',
      '--poster-border': '#c7c7c7',
      '--frame-bg': '#ffffff',
      '--frame-inner': '#efefef',
      '--frame-border': '#b4b4b4',
      '--text-main': '#171717',
      '--text-muted': '#4e4e4e',
      '--control-bg': '#ffffff',
      '--control-border': '#bdbdbd',
      '--map-filter': 'grayscale(1) contrast(1.35) brightness(1.02)',
      '--marker-color': '#111111',
      '--attribution-bg': 'rgba(255, 255, 255, 0.75)',
      '--attribution-color': '#2f2f2f',
    },
  },
  'Mono Dark': {
    tile: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      options: {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    cssVars: {
      '--page-bg': '#111215',
      '--page-accent-a': '#1b1d23',
      '--page-accent-b': '#181a1e',
      '--poster-bg': '#1a1c20',
      '--poster-border': '#444954',
      '--frame-bg': '#1f2228',
      '--frame-inner': '#15181d',
      '--frame-border': '#535965',
      '--text-main': '#f1f1f1',
      '--text-muted': '#c4c7ce',
      '--control-bg': '#20242b',
      '--control-border': '#4f5560',
      '--map-filter': 'grayscale(1) contrast(1.5) brightness(1.07)',
      '--marker-color': '#f8f8f8',
      '--attribution-bg': 'rgba(20, 22, 26, 0.7)',
      '--attribution-color': '#d6dae2',
    },
  },
};

const placeInput = document.querySelector('#place-input');
const themeSelect = document.querySelector('#theme-select');
const updateBtn = document.querySelector('#update-btn');
const posterTitle = document.querySelector('#poster-title');

let map;
let centerMarker;
let activeTileLayer;

/**
 * Map adapter: isolated so swapping Leaflet -> MapLibre later is easy.
 * TODO(MapLibre): replace this function with a MapLibre map initializer.
 */
function initializeMapEngine(containerId, initialView, themeName = DEFAULT_THEME) {
  const mapInstance = L.map(containerId, {
    zoomControl: false,
    attributionControl: true,
  }).setView([initialView.lat, initialView.lon], initialView.zoom ?? DEFAULT_ZOOM);

  activeTileLayer = buildTileLayer(themeName).addTo(mapInstance);
  return mapInstance;
}

function buildTileLayer(themeName) {
  const theme = THEME_CONFIG[themeName] ?? THEME_CONFIG[DEFAULT_THEME];
  return L.tileLayer(theme.tile.url, theme.tile.options);
}

function applyPosterTheme(themeName) {
  const theme = THEME_CONFIG[themeName] ?? THEME_CONFIG[DEFAULT_THEME];

  Object.entries(theme.cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  if (map) {
    const nextTileLayer = buildTileLayer(themeName);
    if (activeTileLayer) {
      map.removeLayer(activeTileLayer);
    }
    activeTileLayer = nextTileLayer.addTo(map);
  }

  // TODO(MapLibre): when moving to vector tiles, replace CSS filter + tile swap
  // with fully custom style layers for roads, water, and land colors.
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
  themeSelect.value = DEFAULT_THEME;
  applyPosterTheme(DEFAULT_THEME);

  map = initializeMapEngine('map', initialView, DEFAULT_THEME);
  centerMarker = createCenterMarker(initialView.lat, initialView.lon).addTo(map);

  themeSelect.addEventListener('change', (event) => {
    applyPosterTheme(event.target.value);
  });

  updateBtn.addEventListener('click', () => updatePosterLocation(placeInput.value));
  placeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updatePosterLocation(placeInput.value);
    }
  });
}

boot();
