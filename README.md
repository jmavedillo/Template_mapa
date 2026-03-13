# Urban map poster prototype

A Vite + vanilla JavaScript prototype focused on **high-legibility urban cartography first**, now powered by the **Google Maps JavaScript API**.

## Run locally

```bash
npm install
VITE_GOOGLE_MAPS_API_KEY=your_key_here npm run dev
```

## Files

- `index.html` – controls + poster shell
- `styles.css` – poster layout and UI chrome
- `main.js` – Google Maps loading, Geocoder lookup, style presets, zoom heuristics, Advanced Marker heart pin

## Current styling phase (embedded JSON only)

- Uses local style preset arrays applied with `map.setOptions({ styles: ... })`
- Includes 3 selectable presets (including Mars Analog Atlas)
- Contains explicit comments where this will later migrate to `mapId` cloud styling

> Important: this phase intentionally does **not** combine local embedded JSON styling and cloud map styling.
