import './styles.css';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_THEME = 'Mono Light';
const DEFAULT_DETAIL_LEVEL = 'Closer';
const BASE_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: 0.4,
  Closer: 1,
  'Very Close': 1.6,
};

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, zoom: 15.2, class: 'place', type: 'city', addresstype: 'city' },
  'Paris, France': { lat: 48.8566, lon: 2.3522, zoom: 15.2, class: 'place', type: 'city', addresstype: 'city' },
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

function classifyStyleLayers() {
  const style = map.getStyle();
  const layers = style.layers ?? [];
  const layerGroups = {
    background: [],
    land: [],
    water: [],
    buildingFill: [],
    buildingOutline: [],
    roadsMajor: [],
    roadsMinor: [],
  };

  layers.forEach((layer) => {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer['source-layer'] ?? '').toLowerCase();

    if (layer.type === 'background') {
      layerGroups.background.push(layer.id);
      return;
    }

    if (layer.type === 'fill' && ['landcover', 'landuse', 'park'].some((token) => sourceLayer.includes(token) || id.includes(token))) {
      layerGroups.land.push(layer.id);
      return;
    }

    if (layer.type === 'fill' && (sourceLayer.includes('water') || id.includes('water'))) {
      layerGroups.water.push(layer.id);
      return;
    }

    if (sourceLayer.includes('building') || id.includes('building')) {
      if (layer.type === 'fill') {
        layerGroups.buildingFill.push(layer.id);
      }
      if (layer.type === 'line') {
        layerGroups.buildingOutline.push(layer.id);
      }
      return;
    }

    const looksLikeRoadLayer =
      layer.type === 'line' &&
      (sourceLayer.includes('transportation') || sourceLayer.includes('road') || id.includes('road') || id.includes('street') || id.includes('highway'));

    if (looksLikeRoadLayer) {
      const majorToken = /(motorway|trunk|primary|secondary|major)/;
      const minorToken = /(tertiary|street|minor|service|residential|path|track|pedestrian)/;

      if (majorToken.test(id)) {
        layerGroups.roadsMajor.push(layer.id);
      } else if (minorToken.test(id)) {
        layerGroups.roadsMinor.push(layer.id);
      } else {
        layerGroups.roadsMinor.push(layer.id);
      }
    }
  });

  if (!layerGroups.roadsMajor.length) {
    layerGroups.roadsMajor = layerGroups.roadsMinor.filter((id) => /(main|route|arterial)/.test(id.toLowerCase()));
  }

  return layerGroups;
}

function initializeMapEngine(containerId, initialView) {
  return new maplibregl.Map({
    container: containerId,
    style: BASE_STYLE_URL,
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

  // We start from a complete OpenMapTiles style and then override key cartography layers.
  const layers = classifyStyleLayers();

  layers.background.forEach((id) => map.setPaintProperty(id, 'background-color', theme.map.background));
  layers.land.forEach((id) => map.setPaintProperty(id, 'fill-color', theme.map.background));

  // Water needs strong contrast so the poster never looks washed out.
  layers.water.forEach((id) => {
    map.setPaintProperty(id, 'fill-color', theme.map.water);
    map.setPaintProperty(id, 'fill-opacity', 0.94);
  });

  // Buildings provide urban texture while staying subtle.
  layers.buildingFill.forEach((id) => {
    map.setPaintProperty(id, 'fill-color', theme.map.building);
    map.setPaintProperty(id, 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 13, 0.25, 15, 0.55, 17, 0.9]);
  });
  layers.buildingOutline.forEach((id) => {
    map.setPaintProperty(id, 'line-color', theme.map.buildingOutline);
    map.setPaintProperty(id, 'line-width', ['interpolate', ['linear'], ['zoom'], 13, 0.2, 16, 0.55, 18, 0.8]);
  });

  // Road hierarchy is the core graphic hierarchy: major roads are thicker and darker than minor roads.
  layers.roadsMajor.forEach((id) => {
    map.setPaintProperty(id, 'line-color', theme.map.majorRoad);
    map.setPaintProperty(id, 'line-opacity', 1);
    map.setPaintProperty(id, 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 1.6, 14.5, 3.4, 16.5, 6.2, 18, 8.8]);
  });
  layers.roadsMinor.forEach((id) => {
    map.setPaintProperty(id, 'line-color', theme.map.minorRoad);
    map.setPaintProperty(id, 'line-opacity', 0.95);
    map.setPaintProperty(id, 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 0.8, 14.5, 1.8, 16.5, 3.1, 18, 4.3]);
  });
}

function createCenterMarker(lat, lon) {
  const markerEl = document.createElement('div');
  markerEl.className = 'heart-marker';
  markerEl.textContent = '❤';
  return new maplibregl.Marker({ element: markerEl, anchor: 'center' }).setLngLat([lon, lat]);
}

function chooseZoomForPlace(location, detailLevel) {
  // Strong urban-detail bias: never start with a regional/country composition.
  let baseZoom = 15.1;

  const addresstype = location.addresstype ?? '';
  const placeClass = location.class ?? '';
  const placeType = location.type ?? '';

  const display = (location.display_name ?? '').toLowerCase();
  const isUrbanPoi =
    ['amenity', 'tourism', 'shop', 'leisure', 'building', 'highway'].includes(placeClass) ||
    ['house', 'road', 'street', 'school'].includes(addresstype) ||
    /(school|street|avenue|plaza|station|hospital|university)/.test(display);

  if (isUrbanPoi) {
    baseZoom = 16.9;
  } else if (['suburb', 'neighbourhood', 'quarter'].includes(addresstype) || ['suburb', 'neighbourhood'].includes(placeType)) {
    baseZoom = 16.1;
  } else if (['city', 'town', 'municipality'].includes(addresstype) || ['city', 'town', 'administrative'].includes(placeType)) {
    baseZoom = 15.2;
  } else if (['country', 'state', 'region'].includes(addresstype) || ['country', 'state'].includes(placeType)) {
    baseZoom = 14.7;
  }

  const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
  return Math.max(14.2, Math.min(18.8, baseZoom + offset));
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
