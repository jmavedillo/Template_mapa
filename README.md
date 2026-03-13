# Urban map poster prototype

A Vite + vanilla JavaScript prototype focused on **high-legibility urban cartography first**, now powered by **MapLibre GL JS + OpenFreeMap**.

## Run locally

```bash
npm install
npm run dev
```

## Files

- `index.html` – controls + poster shell
- `styles.css` – poster layout and UI chrome
- `main.js` – MapLibre setup, OpenFreeMap style switching, Nominatim geocoding, zoom heuristics, centered heart marker

## OpenFreeMap styles in use

The style selector currently switches between these hosted OpenFreeMap styles:

- `https://tiles.openfreemap.org/styles/liberty`
- `https://tiles.openfreemap.org/styles/positron`
- `https://tiles.openfreemap.org/styles/bright`

## Where to replace with a custom hosted style later

In `main.js`, edit the `OPENFREEMAP_STYLES` object. Replace any hosted URL with your own hosted style JSON URL (for example, a Maputnik-edited style you host yourself).

## Attribution

Attribution must remain visible in the rendered map to comply with OpenStreetMap/OpenFreeMap data and style terms.
