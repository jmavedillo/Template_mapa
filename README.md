# Minimal map poster prototype

A tiny Vite + vanilla JavaScript prototype for a premium-looking, minimalist map poster.

## Run locally

```bash
npm install
npm run dev
```

## Files

- `index.html` – layout (controls + poster shell)
- `styles.css` – poster styling + theme-driven map treatment
- `main.js` – Leaflet map setup, theme switching, marker, and location update logic

## Where to tweak quickly

- **Poster size:** `styles.css` → `--poster-width`, `--poster-ratio`
- **Frame thickness:** `styles.css` → `--frame-thickness`
- **Marker size:** `styles.css` → `--marker-size` and `main.js` → `iconSize`
- **Map zoom:** `main.js` → `DEFAULT_ZOOM` and per-location zoom values
- **Theme definitions:** `main.js` → `THEME_CONFIG`

## Adding more themes

1. Add a new entry in `THEME_CONFIG` inside `main.js`.
2. Define both:
   - `tile` (`url` + `options`) for the Leaflet base map source.
   - `cssVars` for poster/page/frame/map filter/marker colors.
3. Add the same theme name as an `<option>` in `index.html` (`#theme-select`).
4. Keep contrast readable first; only use light CSS filtering on tiles if roads and water remain clear.

## Notes for future evolution

In `main.js` there are TODO markers showing where to:

- replace Leaflet with MapLibre for full vector cartographic control
- replace free geocoding with a paid provider
- add high-resolution export flow
