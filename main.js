import './styles.css';
import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_STYLE = 'Monochrome Editorial';
const DEFAULT_DETAIL_LEVEL = 'Closer';
const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: -0.35,
  Closer: 0.45,
  'Very Close': 1.1,
};

const COMMUNICATION_CONTENT = {
  song: {
    coverUrl: 'https://picsum.photos/seed/album-cover/120',
    title: 'Bad Bunny // DTMF',
    subtitle: 'Mood: nocturnal downtown energy',
  },
  place: {
    name: 'Puerta del Sol',
    subtitle: 'Madrid Centro',
  },
  time: {
    dayDate: 'Viernes 16 de marzo',
    time: '20:34',
  },
  message: {
    text: 'Te espero aquí. Hoy se lía.',
    timestamp: '20:34',
    status: '✓✓',
  },
};

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, display_name: 'Madrid, Spain', addresstype: 'city' },
  'Paris, France': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, France', addresstype: 'city' },
};

const placeInput = document.querySelector('#place-input');
const styleSelect = document.querySelector('#theme-select');
const detailSelect = document.querySelector('#detail-select');
const updateBtn = document.querySelector('#update-btn');
const messageBandText = document.querySelector('#message-band-text');
const messageBandTime = document.querySelector('.message-band__time');
const messageBandTicks = document.querySelector('.message-band__ticks');
const communicationOverlay = document.querySelector('#communication-overlay');

let map;
let centerMarker;
let cachedEditorialStyle;

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

  const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
  return Math.max(13, Math.min(19, baseZoom + offset));
}

function ensurePinMarker(lngLat) {
  if (!centerMarker) {
    const markerEl = document.createElement('div');
    markerEl.className = 'pin-marker';
    markerEl.innerHTML = '<div class="pin-marker__inner" aria-hidden="true"></div>';

    centerMarker = new maplibregl.Marker({ element: markerEl, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
    return;
  }

  centerMarker.setLngLat(lngLat);
}

function renderCommunicationOverlay(content) {
  const blocks = [];

  if (content.song?.title) {
    blocks.push(`
      <article class="overlay-card overlay-card--song" aria-label="Song card">
        ${content.song.coverUrl ? `<img class="overlay-song-cover" src="${content.song.coverUrl}" alt="Album cover" />` : ''}
        <div class="overlay-song-copy">
          <p class="overlay-eyebrow">Song</p>
          <p class="overlay-primary">${content.song.title}</p>
          ${content.song.subtitle ? `<p class="overlay-secondary">${content.song.subtitle}</p>` : ''}
        </div>
      </article>
    `);
  }

  if (content.place?.name) {
    blocks.push(`
      <article class="overlay-card overlay-card--place" aria-label="Place card">
        <p class="overlay-eyebrow">Place</p>
        <p class="overlay-primary">${content.place.name}</p>
        ${content.place.subtitle ? `<p class="overlay-secondary">${content.place.subtitle}</p>` : ''}
      </article>
    `);
  }

  if (content.time?.dayDate || content.time?.time) {
    blocks.push(`
      <article class="overlay-card overlay-card--time" aria-label="Time card">
        <p class="overlay-eyebrow">Time</p>
        ${content.time.dayDate ? `<p class="overlay-primary">${content.time.dayDate}</p>` : ''}
        ${content.time.time ? `<p class="overlay-secondary overlay-time-value">${content.time.time}</p>` : ''}
      </article>
    `);
  }

  communicationOverlay.innerHTML = blocks.join('');

  if (messageBandText && content.message?.text) messageBandText.textContent = content.message.text;
  if (messageBandTime && content.message?.timestamp) messageBandTime.textContent = content.message.timestamp;
  if (messageBandTicks && content.message?.status) messageBandTicks.textContent = content.message.status;
}

function classifyRoadWeight(layerId) {
  if (/(motorway|trunk|primary|highway|arterial|major)/i.test(layerId)) return 'major';
  if (/(secondary|tertiary)/i.test(layerId)) return 'secondary';
  return 'minor';
}

function restyleLayer(layer) {
  const id = layer.id || '';

  if (layer.type === 'symbol') {
    return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
  }

  if (layer.type === 'circle' || layer.type === 'heatmap' || layer.type === 'fill-extrusion') {
    return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
  }

  if (layer.type === 'background') {
    return { ...layer, paint: { ...(layer.paint || {}), 'background-color': '#f3f3f0' } };
  }

  if (layer.type === 'fill') {
    if (/(water|ocean|river|lake|reservoir)/i.test(id)) {
      return {
        ...layer,
        paint: { ...(layer.paint || {}), 'fill-color': '#e7e7e3', 'fill-opacity': 0.9 },
      };
    }

    if (/(building)/i.test(id)) {
      return {
        ...layer,
        paint: { ...(layer.paint || {}), 'fill-color': '#d9d9d5', 'fill-opacity': 0.45 },
      };
    }

    if (/(park|grass|wood|forest|landcover|landuse|cemetery|pitch)/i.test(id)) {
      return {
        ...layer,
        paint: { ...(layer.paint || {}), 'fill-color': '#eeeeeb', 'fill-opacity': 0.8 },
      };
    }

    return {
      ...layer,
      paint: { ...(layer.paint || {}), 'fill-color': '#f0f0ec', 'fill-opacity': 0.85 },
    };
  }

  if (layer.type === 'line') {
    if (/(boundary|admin|border)/i.test(id)) {
      return {
        ...layer,
        paint: {
          ...(layer.paint || {}),
          'line-color': '#b3b3ae',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.2, 12, 0.7, 16, 1.1],
          'line-opacity': 0.55,
        },
      };
    }

    const roadWeight = classifyRoadWeight(id);
    const roadPalette = {
      major: {
        color: '#262626',
        width: ['interpolate', ['linear'], ['zoom'], 8, 0.9, 12, 1.7, 15, 2.8, 17, 4.1],
      },
      secondary: {
        color: '#535353',
        width: ['interpolate', ['linear'], ['zoom'], 8, 0.55, 12, 1.05, 15, 1.65, 17, 2.4],
      },
      minor: {
        color: '#888888',
        width: ['interpolate', ['linear'], ['zoom'], 8, 0.22, 12, 0.52, 15, 0.95, 17, 1.45],
      },
    };

    const pick = roadPalette[roadWeight];

    return {
      ...layer,
      paint: {
        ...(layer.paint || {}),
        'line-color': pick.color,
        'line-width': pick.width,
        'line-opacity': 0.95,
      },
    };
  }

  return layer;
}

async function loadMonochromeEditorialStyle() {
  if (cachedEditorialStyle) return structuredClone(cachedEditorialStyle);

  const response = await fetch(BASE_STYLE_URL);
  if (!response.ok) throw new Error(`Style fetch failed (${response.status}).`);

  const style = await response.json();
  const curated = {
    ...style,
    layers: (style.layers || []).map(restyleLayer),
  };

  cachedEditorialStyle = curated;
  return structuredClone(cachedEditorialStyle);
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
    ensurePinMarker(lngLat);

  } catch (error) {
    console.error(error);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = 'Update poster';
  }
}

async function applySelectedStyle() {
  const styleObject = await loadMonochromeEditorialStyle();
  map.setStyle(styleObject);
}

async function boot() {
  styleSelect.value = DEFAULT_STYLE;
  detailSelect.value = DEFAULT_DETAIL_LEVEL;

  renderCommunicationOverlay(COMMUNICATION_CONTENT);

  map = new maplibregl.Map({
    container: 'map',
    style: await loadMonochromeEditorialStyle(),
    center: [EXAMPLE_LOCATIONS[DEFAULT_PLACE].lon, EXAMPLE_LOCATIONS[DEFAULT_PLACE].lat],
    zoom: chooseZoomForPlace(EXAMPLE_LOCATIONS[DEFAULT_PLACE], DEFAULT_DETAIL_LEVEL),
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    const defaultLngLat = [EXAMPLE_LOCATIONS[DEFAULT_PLACE].lon, EXAMPLE_LOCATIONS[DEFAULT_PLACE].lat];
    ensurePinMarker(defaultLngLat);
  });

  styleSelect.addEventListener('change', () => applySelectedStyle());
  detailSelect.addEventListener('change', () => updatePosterLocation(placeInput.value));
  updateBtn.addEventListener('click', () => updatePosterLocation(placeInput.value));
  placeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') updatePosterLocation(placeInput.value);
  });
}

boot();
