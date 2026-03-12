import './styles.css';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_THEME = 'Mono Light';
const DEFAULT_DETAIL_LEVEL = 'Closer';

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: 0,
  Closer: 1,
  'Very Close': 2,
};

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, zoom: 15.2, class: 'place', type: 'city', addresstype: 'city' },
  'Paris, France': { lat: 48.8566, lon: 2.3522, zoom: 15.2, class: 'place', type: 'city', addresstype: 'city' },
};

const BASE_CARTOGRAPHY = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://demotiles.maplibre.org/tiles/tiles.json',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f8f7f3' } },

    // Water visibility and tone are controlled here.
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#b6bcc4', 'fill-opacity': 1 },
    },

    // Building masses/footprints are controlled here.
    {
      id: 'buildings',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: { 'fill-color': '#d8d6d0', 'fill-opacity': 0.9 },
    },
    {
      id: 'building-outline',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: { 'line-color': '#c3c0b8', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.4, 17, 0.8] },
    },

    // Major road thickness and color are controlled here.
    {
      id: 'roads-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link']],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#4f4f4f',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.4, 14, 2.8, 16, 4.2, 18, 6.2],
        'line-opacity': 0.98,
      },
    },

    // Secondary/local road visibility and thickness are controlled here.
    {
      id: 'roads-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['tertiary', 'tertiary_link', 'street', 'street_limited', 'service', 'minor', 'track']],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#707070',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 14, 1.6, 16, 2.8, 18, 4],
        'line-opacity': 0.95,
      },
    },
  ],
};

const POSTER_THEMES = {
  'Mono Light': {
    map: {
      background: '#f5f4f1',
      water: '#a9afb8',
      building: '#d8d6d1',
      buildingOutline: '#bbb8b1',
      majorRoad: '#454545',
      minorRoad: '#777777',
    },
    cssVars: {
      '--page-bg': '#f1efeb',
      '--poster-bg': '#fbfaf7',
      '--poster-border': '#cdc9bf',
      '--frame-bg': '#fffefb',
      '--frame-inner': '#f3f1eb',
      '--frame-border': '#c7c2b7',
      '--text-main': '#171717',
      '--text-muted': '#4f4f4f',
      '--control-bg': '#fffefb',
      '--control-border': '#bdb8ad',
      '--marker-color': '#1f1f1f',
      '--attribution-bg': 'rgba(255, 255, 255, 0.8)',
      '--attribution-color': '#303030',
    },
  },
  'Soft Blue': {
    map: {
      background: '#eef3f8',
      water: '#94a9bc',
      building: '#d7e0ea',
      buildingOutline: '#b6c2cf',
      majorRoad: '#33516d',
      minorRoad: '#567492',
    },
    cssVars: {
      '--page-bg': '#e8eff6',
      '--poster-bg': '#f4f8fc',
      '--poster-border': '#b8c7d6',
      '--frame-bg': '#f7faff',
      '--frame-inner': '#e7eef6',
      '--frame-border': '#b6c4d4',
      '--text-main': '#1c3045',
      '--text-muted': '#4e657d',
      '--control-bg': '#f8fbff',
      '--control-border': '#afc0d1',
      '--marker-color': '#1d4469',
      '--attribution-bg': 'rgba(237, 245, 255, 0.82)',
      '--attribution-color': '#234661',
    },
  },
  'Mono Dark': {
    map: {
      background: '#1a1d20',
      water: '#6d747d',
      building: '#2f353c',
      buildingOutline: '#454b53',
      majorRoad: '#f2f2f2',
      minorRoad: '#b8bec4',
    },
    cssVars: {
      '--page-bg': '#111316',
      '--poster-bg': '#1a1d22',
      '--poster-border': '#505862',
      '--frame-bg': '#1f2328',
      '--frame-inner': '#16191d',
      '--frame-border': '#5a616b',
      '--text-main': '#f2f4f5',
      '--text-muted': '#c4cad2',
      '--control-bg': '#23282f',
      '--control-border': '#5a616c',
      '--marker-color': '#ffffff',
      '--attribution-bg': 'rgba(26, 30, 36, 0.82)',
      '--attribution-color': '#d6dce3',
    },
  },
};

const placeInput = document.querySelector('#place-input');
const themeSelect = document.querySelector('#theme-select');
const detailSelect = document.querySelector('#detail-select');
const updateBtn = document.querySelector('#update-btn');
const posterTitle = document.querySelector('#poster-title');

let map;
let centerMarker;

function initializeMapEngine(containerId, initialView) {
  return new maplibregl.Map({
    container: containerId,
    style: BASE_CARTOGRAPHY,
    center: [initialView.lon, initialView.lat],
    zoom: initialView.zoom,
    attributionControl: true,
    dragRotate: false,
    touchZoomRotate: false,
  });
}

function applyPosterTheme(themeName) {
  const theme = POSTER_THEMES[themeName] ?? POSTER_THEMES[DEFAULT_THEME];

  Object.entries(theme.cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  if (!map || !map.isStyleLoaded()) {
    return;
  }

  map.setPaintProperty('background', 'background-color', theme.map.background);
  map.setPaintProperty('water', 'fill-color', theme.map.water);
  map.setPaintProperty('buildings', 'fill-color', theme.map.building);
  map.setPaintProperty('building-outline', 'line-color', theme.map.buildingOutline);
  map.setPaintProperty('roads-major', 'line-color', theme.map.majorRoad);
  map.setPaintProperty('roads-minor', 'line-color', theme.map.minorRoad);
}

function createCenterMarker(lat, lon) {
  const markerEl = document.createElement('div');
  markerEl.className = 'heart-marker';
  markerEl.textContent = '❤';
  return new maplibregl.Marker({ element: markerEl, anchor: 'center' }).setLngLat([lon, lat]);
}

function chooseZoomForPlace(location, detailLevel) {
  // Biased toward urban detail, not broad regional framing.
  let baseZoom = 14.8;

  const addresstype = location.addresstype ?? '';
  const placeClass = location.class ?? '';
  const placeType = location.type ?? '';

  if (['country', 'state', 'region'].includes(addresstype) || ['country', 'state'].includes(placeType)) {
    baseZoom = 12.2;
  } else if (['city', 'town'].includes(addresstype) || ['city', 'town', 'administrative'].includes(placeType)) {
    baseZoom = 14.8;
  } else if (['suburb', 'neighbourhood', 'quarter'].includes(addresstype) || ['suburb', 'neighbourhood'].includes(placeType)) {
    baseZoom = 15.6;
  } else if (placeClass === 'place' && placeType === 'village') {
    baseZoom = 15;
  } else if (
    ['amenity', 'tourism', 'shop', 'leisure', 'building', 'highway'].includes(placeClass) ||
    ['house', 'road'].includes(addresstype)
  ) {
    baseZoom = 16.7;
  }

  const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
  return Math.max(12, Math.min(18.8, baseZoom + offset));
}

async function geocodePlace(query) {
  if (EXAMPLE_LOCATIONS[query]) {
    return EXAMPLE_LOCATIONS[query];
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '1');
  endpoint.searchParams.set('addressdetails', '1');

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
    throw new Error('No place found. Try a district, neighborhood, or address.');
  }

  return {
    ...data[0],
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function updatePosterLocation(query) {
  const target = query.trim() || DEFAULT_PLACE;

  updateBtn.disabled = true;
  updateBtn.textContent = 'Updating...';

  try {
    const location = await geocodePlace(target);
    const zoom = chooseZoomForPlace(location, detailSelect.value);

    map.easeTo({
      center: [location.lon, location.lat],
      zoom,
      duration: 900,
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
  detailSelect.value = DEFAULT_DETAIL_LEVEL;

  map = initializeMapEngine('map', initialView);

  map.on('load', () => {
    applyPosterTheme(DEFAULT_THEME);
    centerMarker = createCenterMarker(initialView.lat, initialView.lon).addTo(map);
  });

  themeSelect.addEventListener('change', (event) => {
    applyPosterTheme(event.target.value);
  });

  detailSelect.addEventListener('change', () => {
    updatePosterLocation(placeInput.value);
  });

  updateBtn.addEventListener('click', () => updatePosterLocation(placeInput.value));
  placeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updatePosterLocation(placeInput.value);
    }
  });
}

boot();
