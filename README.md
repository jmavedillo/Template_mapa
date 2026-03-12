# Urban map poster prototype

A Vite + vanilla JavaScript prototype focused on **high-legibility urban cartography first**, then minimal poster theming.

## Run locally

```bash
npm install
npm run dev
```

## Files

- `index.html` – controls + poster shell
- `styles.css` – poster layout and UI chrome
- `main.js` – MapLibre cartographic base, theme overrides, geocoding, zoom heuristics

## Cartographic architecture

- **Base map style (`BASE_CARTOGRAPHY`)** controls map structure and readability:
  - road hierarchy layers (major/minor) and line thickness
  - building fills + outlines
  - water shapes
  - clean background
- **Poster themes (`POSTER_THEMES`)** only adjust colors for the same structural map base.

## Zoom behavior

`chooseZoomForPlace()` selects zoom by place type and addresstype from Nominatim, then applies the user-selected detail level:

- `Close`
- `Closer`
- `Very Close`

The logic is intentionally biased to neighborhood/city-detail zooms for poster legibility.
