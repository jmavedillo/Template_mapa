# Minimal map poster prototype

A tiny Vite + vanilla JavaScript prototype for a premium-looking, minimalist map poster.

## Run locally

```bash
npm install
npm run dev
```

## Files

- `index.html` – layout (controls + poster shell)
- `styles.css` – premium poster styling + map treatment
- `main.js` – Leaflet map setup, marker, and location update logic

## Where to tweak quickly

- **Poster size:** `styles.css` → `--poster-width`, `--poster-ratio`
- **Frame thickness:** `styles.css` → `--frame-thickness`
- **Marker size:** `styles.css` → `--marker-size` and `main.js` → `iconSize`
- **Map zoom:** `main.js` → `DEFAULT_ZOOM` and per-location zoom values
- **Grayscale / contrast:** `styles.css` → `.poster-map { filter: ... }`

## Notes for future evolution

In `main.js` there are TODO markers showing where to:

- replace Leaflet with MapLibre
- replace free geocoding with a paid provider
- add high-resolution export flow
