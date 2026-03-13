import './styles.css';

const DEFAULT_PLACE = 'Madrid, Spain';
const DEFAULT_STYLE = 'Mars Analog Atlas';
const DEFAULT_DETAIL_LEVEL = 'Closer';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DETAIL_LEVEL_ZOOM_OFFSET = {
  Close: 0.5,
  Closer: 1.1,
  'Very Close': 1.7,
};

const EXAMPLE_LOCATIONS = {
  'Madrid, Spain': { lat: 40.4168, lng: -3.7038, locationType: 'city' },
  'Paris, France': { lat: 48.8566, lng: 2.3522, locationType: 'city' },
};

const MAP_STYLE_PRESETS = {
  'Mars Analog Atlas': [
    { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#e0c9a6' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e0c9a6' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d3b38c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#883b20' }] },
  ],
  'Urban Paper': [
    { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#343434' }] },
    { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#f4f1ea' }, { weight: 2 }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f1ebdd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#ebe4d6' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#7f848b' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#9da2a8' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#b4b8bc' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#6f8698' }] },
  ],
  'Midnight Ink': [
    { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#f3f4f5' }] },
    { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#15181b' }, { weight: 2 }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1f252a' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#242b31' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8edf2' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#c2cad1' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#8a939b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#4a5b67' }] },
  ],
};

const placeInput = document.querySelector('#place-input');
const styleSelect = document.querySelector('#theme-select');
const detailSelect = document.querySelector('#detail-select');
const updateBtn = document.querySelector('#update-btn');
const posterTitle = document.querySelector('#poster-title');

let map;
let geocoder;
let centerMarker;
let AdvancedMarkerElement;

function loadGoogleMapsScript() {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY in environment.');
  }

  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google Maps JavaScript API failed to load.'));
    document.head.appendChild(script);
  });
}

function chooseZoomForPlace(result, detailLevel) {
  // Strong urban-detail bias for poster readability.
  let baseZoom = 15.4;

  const resultType = result.types ?? [];

  if (resultType.includes('street_address') || resultType.includes('premise') || resultType.includes('point_of_interest')) {
    baseZoom = 17.2;
  } else if (resultType.includes('neighborhood') || resultType.includes('sublocality')) {
    baseZoom = 16.4;
  } else if (resultType.includes('locality')) {
    baseZoom = 15.6;
  }

  const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
  return Math.max(14.4, Math.min(19, baseZoom + offset));
}

function createHeartMarker(position) {
  const markerEl = document.createElement('div');
  markerEl.className = 'heart-marker';
  markerEl.textContent = '❤';

  return new AdvancedMarkerElement({
    map,
    position,
    content: markerEl,
    title: 'Poster center marker',
  });
}

function applySelectedStyle(styleName) {
  const styles = MAP_STYLE_PRESETS[styleName] ?? MAP_STYLE_PRESETS[DEFAULT_STYLE];

  // Phase 1: embedded JSON styling via MapOptions.styles.
  // Future migration point: replace this with mapId cloud styling (and remove styles arrays).
  map.setOptions({ styles });
}

async function geocodePlace(query) {
  if (EXAMPLE_LOCATIONS[query]) {
    return {
      latLng: EXAMPLE_LOCATIONS[query],
      types: ['locality'],
      formatted_address: query,
    };
  }

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: query }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        reject(new Error('No place found. Try a district, neighborhood, or address.'));
        return;
      }

      const topResult = results[0];
      resolve({
        latLng: topResult.geometry.location,
        types: topResult.types,
        formatted_address: topResult.formatted_address,
      });
    });
  });
}

async function updatePosterLocation(query) {
  const target = query.trim() || DEFAULT_PLACE;
  updateBtn.disabled = true;
  updateBtn.textContent = 'Updating...';

  try {
    const result = await geocodePlace(target);
    const zoom = chooseZoomForPlace(result, detailSelect.value);

    map.panTo(result.latLng);
    map.setZoom(zoom);

    if (centerMarker) {
      centerMarker.map = null;
    }

    centerMarker = createHeartMarker(result.latLng);
    posterTitle.textContent = result.formatted_address;
  } catch (error) {
    posterTitle.textContent = `Place not found: ${target}`;
    console.error(error);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = 'Update poster';
  }
}

async function boot() {
  await loadGoogleMapsScript();

  const { Map } = await google.maps.importLibrary('maps');
  const { Geocoder } = await google.maps.importLibrary('geocoding');
  ({ AdvancedMarkerElement } = await google.maps.importLibrary('marker'));

  geocoder = new Geocoder();

  styleSelect.value = DEFAULT_STYLE;
  detailSelect.value = DEFAULT_DETAIL_LEVEL;

  map = new Map(document.querySelector('#map'), {
    center: EXAMPLE_LOCATIONS[DEFAULT_PLACE],
    zoom: chooseZoomForPlace({ types: ['locality'] }, DEFAULT_DETAIL_LEVEL),
    disableDefaultUI: true,
    draggable: true,
    gestureHandling: 'greedy',
    // Phase 1 uses local embedded JSON styles only.
    // Future migration point: replace `styles` with a cloud-managed `mapId`.
    styles: MAP_STYLE_PRESETS[DEFAULT_STYLE],
  });

  centerMarker = createHeartMarker(EXAMPLE_LOCATIONS[DEFAULT_PLACE]);

  styleSelect.addEventListener('change', (event) => {
    applySelectedStyle(event.target.value);
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

boot().catch((error) => {
  console.error(error);
  posterTitle.textContent = 'Google Maps failed to initialize';
});
