# UK Cricket Grounds — automated map

This repo holds a static site (Leaflet + OpenStreetMap tiles) and a GitHub Action to fetch all UK cricket pitches from OpenStreetMap weekly, plus one image per ground via Wikimedia.

## How it works

- `scripts/fetch_osm_cricket.js` runs an Overpass query for all features with `leisure=pitch` and `sport=cricket` in the UK, normalises them, and writes `data/grounds.json`.
- `scripts/enrich_images_wikimedia.js` fills `image_url`, `image_credit`, and `image_license` using OSM tags or Wikimedia APIs.
- `.github/workflows/update_data.yml` runs both on a weekly schedule and on manual dispatch, then commits any changes.
- `index.html` renders the map with thumbnails; `ground.html` shows a detail page and hero image.

## Local dev

- You can open `index.html` directly in a browser, or serve statically.
- To run the scripts locally:
  ```
  node scripts/fetch_osm_cricket.js
  node scripts/enrich_images_wikimedia.js
  ```

## Notes

- Be respectful of public APIs. The scripts include simple delays and a weekly schedule by default.
- Image licensing depends on Wikimedia sources. We attempt to store short license names; always keep attribution visible on your site (we show it on the detail page).
- Some OSM objects lack names or accurate centres. We filter out entries without numeric coordinates.

