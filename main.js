import './styles.css';
import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1';

const DEFAULT_STYLE = 'Monochrome Editorial';
const DEFAULT_DETAIL_LEVEL = 'Closer';
const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: -0.35,
  Closer: 0.45,
  'Very Close': 1.1,
};

const TEMPLATE_PRESETS = {
  fullExample: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    song: {
      title: 'DTMF',
      artist: 'Bad Bunny',
      coverUrl: 'https://picsum.photos/seed/album-cover/120',
    },
    place: {
      title: 'Puerta del Sol',
      subtitle: 'Madrid Centro',
    },
    time: {
      dateText: 'Viernes 16 de marzo',
      timeText: '20:34',
    },
    message: {
      intro: 'Te espero aquí.',
      main: 'NO FALLES',
    },
    marker: {
      type: 'pin',
    },
  },
  noSong: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    place: {
      title: 'Puerta del Sol',
      subtitle: 'Madrid Centro',
    },
    time: {
      dateText: 'Viernes 16 de marzo',
      timeText: '20:34',
    },
    message: {
      intro: 'Te espero aquí.',
      main: 'NO FALLES',
    },
    marker: {
      type: 'pin',
    },
  },
  noTime: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    song: {
      title: 'DTMF',
      artist: 'Bad Bunny',
      coverUrl: 'https://picsum.photos/seed/album-cover/120',
    },
    place: {
      title: 'Puerta del Sol',
      subtitle: 'Madrid Centro',
    },
    message: {
      intro: 'Te espero aquí.',
      main: 'NO FALLES',
    },
    marker: {
      type: 'pin',
    },
  },
  noPlaceSubtitle: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    song: {
      title: 'DTMF',
      artist: 'Bad Bunny',
      coverUrl: 'https://picsum.photos/seed/album-cover/120',
    },
    place: {
      title: 'Puerta del Sol',
    },
    time: {
      dateText: 'Viernes 16 de marzo',
      timeText: '20:34',
    },
    message: {
      intro: 'Te espero aquí.',
      main: 'NO FALLES',
    },
    marker: {
      type: 'pin',
    },
  },
  shortMessage: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    song: {
      title: 'DTMF',
      artist: 'Bad Bunny',
      coverUrl: 'https://picsum.photos/seed/album-cover/120',
    },
    place: {
      title: 'Puerta del Sol',
      subtitle: 'Madrid Centro',
    },
    time: {
      dateText: 'Viernes 16 de marzo',
      timeText: '20:34',
    },
    message: {
      main: 'VEN',
    },
    marker: {
      type: 'pin',
    },
  },
  longerMessage: {
    template: 'map_message_v1',
    mapQuery: 'Puerta del Sol, Madrid',
    song: {
      title: 'DTMF',
      artist: 'Bad Bunny',
      coverUrl: 'https://picsum.photos/seed/album-cover/120',
    },
    place: {
      title: 'Puerta del Sol',
      subtitle: 'Madrid Centro',
    },
    time: {
      dateText: 'Viernes 16 de marzo',
      timeText: '20:34',
    },
    message: {
      intro: 'Te espero en el punto exacto del mapa cuando caiga el sol.',
      main: 'NO LLEGUES TARDE, ESTA NOCHE ES CLAVE',
    },
    marker: {
      type: 'pin',
    },
  },
};

const templateData = TEMPLATE_PRESETS.fullExample;

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lon: -3.7038, display_name: 'Madrid, Spain', addresstype: 'city' },
  'Puerta del Sol, Madrid': { lat: 40.4169, lon: -3.7035, display_name: 'Puerta del Sol, Madrid', addresstype: 'amenity' },
  'Paris, France': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, France', addresstype: 'city' },
};

const placeInput = document.querySelector('#place-input');
const styleSelect = document.querySelector('#theme-select');
const detailSelect = document.querySelector('#detail-select');
const updateBtn = document.querySelector('#update-btn');

const songCard = document.querySelector('#song-card');
const songCover = document.querySelector('#song-cover');
const songTitle = document.querySelector('#song-title');
const placeCard = document.querySelector('#place-card');
const placeTitle = document.querySelector('#place-title');
const placeSubtitle = document.querySelector('#place-subtitle');
const timeCard = document.querySelector('#time-card');
const timeDate = document.querySelector('#time-date');
const timeValue = document.querySelector('#time-value');
const messageBand = document.querySelector('#message-band');
const messageBandSupport = document.querySelector('#message-band-support');
const messageBandHero = document.querySelector('#message-band-hero');

let map;
let centerMarker;
let cachedEditorialStyle;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function setText(element, value) {
  const text = hasText(value) ? value.trim() : '';
  element.textContent = text;
  element.hidden = text.length === 0;
}

function renderTemplate(data) {
  const songLine = [data.song?.title, data.song?.artist].filter(hasText).join(' · ');
  const songExists = hasText(songLine) || hasText(data.song?.coverUrl);
  songCard.hidden = !songExists;
  if (songExists) {
    setText(songTitle, songLine);
    if (hasText(data.song?.coverUrl)) {
      songCover.src = data.song.coverUrl.trim();
      songCover.hidden = false;
    } else {
      songCover.removeAttribute('src');
      songCover.hidden = true;
    }
  }

  const placeExists = hasText(data.place?.title) || hasText(data.place?.subtitle);
  placeCard.hidden = !placeExists;
  if (placeExists) {
    setText(placeTitle, data.place?.title);
    setText(placeSubtitle, data.place?.subtitle);
  }

  const timeExists = hasText(data.time?.dateText) || hasText(data.time?.timeText);
  timeCard.hidden = !timeExists;
  if (timeExists) {
    setText(timeDate, data.time?.dateText);
    setText(timeValue, data.time?.timeText);
  }

  setText(messageBandSupport, data.message?.intro);
  setText(messageBandHero, data.message?.main);

  const hasMessage = hasText(data.message?.intro) || hasText(data.message?.main);
  messageBand.hidden = !hasMessage;
}

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
  if (templateData.marker?.type !== 'pin') return;

  if (!centerMarker) {
    const markerEl = document.createElement('div');
    markerEl.className = 'pin-marker';
    markerEl.innerHTML = '<div class="pin-marker__inner" aria-hidden="true"></div>';

    centerMarker = new maplibregl.Marker({ element: markerEl, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
    return;
  }

  centerMarker.setLngLat(lngLat);
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
  const target = query.trim() || templateData.mapQuery;
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
  placeInput.value = templateData.mapQuery;

  renderTemplate(templateData);

  const defaultLocation = await geocodePlace(templateData.mapQuery);

  map = new maplibregl.Map({
    container: 'map',
    style: await loadMonochromeEditorialStyle(),
    center: [Number(defaultLocation.lon), Number(defaultLocation.lat)],
    zoom: chooseZoomForPlace(defaultLocation, DEFAULT_DETAIL_LEVEL),
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    const defaultLngLat = [Number(defaultLocation.lon), Number(defaultLocation.lat)];
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
