# Active Places (Sport England) — integration notes

Active Places Power publishes England’s facilities data (downloads + APIs via ArcGIS).
Start here:
- Hub & API entry points: https://active-places-power-sportengarena.hub.arcgis.com/
- Sports Data Model overview: https://active-places-power-sportengarena.hub.arcgis.com/pages/sportsdatamodel

## Plan
1) Identify the facility layer that contains cricket pitches/sites.
2) Use WFS/GeoJSON endpoint; filter to cricket (field names differ per layer).
3) For each record in `data/grounds.json`, find nearest Active Places feature within ~1km, then copy:
   - `SiteName`, `FacilityName`, `ManagementType`, `Postcode`, `Address`, `Website`
4) Add `source_active_places: true` and keep `source_osm: true`.
5) Run weekly; Active Places updates frequently (often nightly).
