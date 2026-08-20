# NH Property Assessment Maps

This software project generates two different scrollable, zoomable, click-able maps that allow exploration of property tax assessment data.

It is currently configured with data for 39 town datasets, including Weare. Three listed provider towns remain pending because the available statewide parcel identifiers do not reliably join to their VGSI map/lot identifiers. The data-acquisition instructions below explain how to use LLM assistance to scrape additional towns and customize this app.

This directory contains a reusable map engine plus generated, standalone Leaflet maps of New Hampshire parcels.

- `map.html` is the maintainable HTTP/WordPress entry point. Use an allowlisted `?town=` slug from the `data/` directories, plus `mode=assessment`, `mode=neighborhood`, or `mode=quality`.
- `dist/assessment-map.html` colors parcels by the percentage increase from 2025 to 2026 assessment.
- `dist/neighborhood-map.html` colors parcels by Avitar neighborhood classification.
- `dist/quality-map.html` colors improved parcels by building quality and shows a minimal quality popup.

### Build artifacts

The files under `dist/` are generated artifacts and are intentionally ignored by Git. Run `python3 build-maps.py` after changing source code or data; the generated HTML remains available locally for `file:///` testing and can be copied to a web server or attached to a release. The repository stores the build script and source data, not the large all-town HTML bundle.

For a clean checkout, regenerate the local maps with:

```sh
python3 build-maps.py
```

Do not manually commit generated files under `dist/`. For distribution, use a release asset or deploy the generated files to the web host.
- `map.js` is the shared engine; `map.css` is the shared stylesheet.

The maps show parcel outlines, assessment values, owners, location, land lines, building data, features, and other information available from the local GIS and assessor property-record pages.

## Licensing

The original software in this project is licensed under the MIT License; see [LICENSE](LICENSE). This includes the map engine, build script, HTML shell, CSS, and other original source code.

The assessment and GIS data files are separate from the software license. They come from Avitar, NH GRANIT/UNH, and other identified sources, and may be subject to their own terms, attribution requirements, or public-record limitations. The included PDFs and extracted source text are also not covered by the MIT license. Do not assume that the MIT license grants rights to redistribute third-party data.

Leaflet and OpenStreetMap are third-party resources and retain their own licenses and attribution requirements.

## Run locally

The generated demo files can be opened directly in a browser:

```text
file:///home/<username>/personal/bus/state_rep/src/nh_property_assessment/dist/assessment-map.html
file:///home/<username>/personal/bus/state_rep/src/nh_property_assessment/dist/neighborhood-map.html
```

The parcel data is embedded in the HTML, so these files do not need a local web server. They do need Internet access for Leaflet, OpenStreetMap tiles, and the map background. If a browser blocks or restricts `file:///` pages, use a small local server instead:

```bash
cd ~/bus/state_rep/src/nh_property_assessment
python3 build-maps.py
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/dist/assessment-map.html
http://localhost:8000/dist/neighborhood-map.html
http://localhost:8000/dist/quality-map.html
http://localhost:8000/map.html?mode=assessment
http://localhost:8000/map.html?mode=neighborhood
http://localhost:8000/map.html?mode=quality
http://localhost:8000/map.html?town=bedford&mode=assessment
http://localhost:8000/map.html?town=goffstown&mode=assessment
```

## Host in WordPress

The maps are static HTML applications. They do not need a WordPress plugin, PHP, a database, or a build step.

You can host them "on the metal" on any webserver and have nginx, Apache, or similar serve the files. Or, if you already have WordPress installed, you can serve them in an iframe inside a WordPress "page". Instructions on this follow.

1. Create a directory such as `maps` in the public document root of the WordPress site.
2. Upload `map.html`, `map.js`, `map.css`, and the needed `data/<town>/assessment-parcels.geojson` files there, preserving the `data/<town>/` subdirectories.
3. Visit the resulting URL, for example:

   ```text
   https://example.com/maps/map.html?town=weare&mode=assessment
   ```

4. In WordPress, edit the target page and add a **Custom HTML** block containing an iframe:

   ```html
   <iframe
     src="/maps/map.html?mode=assessment"
     title="Weare property assessment map"
     style="width:100%; height:800px; border:0;"
     loading="lazy">
   </iframe>
   ```

Use `town=bedford` to select Bedford and `mode=neighborhood` or `mode=quality` for the other views. Alternatively, upload `dist/map.html` if you want one self-contained artifact containing both towns, or upload the individual generated files from `dist/`. Uploading through the normal WordPress Media Library may reject `.html` files; server-side upload is the appropriate method. Make sure the site permits the iframe source and that the server serves `.html` as a normal text/HTML file.

## Data files

| File | Format | Purpose |
|---|---|---|
| `map.html` | HTML shell | HTTP/WordPress entry point; selects the view with `?mode=`. |
| `map.js` | JavaScript | Shared map engine. |
| `map.css` | CSS | Shared map and legend styling. |
| `data/weare/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Canonical Weare enriched parcel geometry and assessment dataset loaded by the engine. |
| `dist/assessment-map.html` | Generated HTML + embedded GeoJSON | File-URL assessment-increase demo. |
| `dist/neighborhood-map.html` | Generated HTML + embedded GeoJSON | File-URL neighborhood-rating demo. |
| `dist/quality-map.html` | Generated HTML + embedded GeoJSON | File-URL building-quality demo with minimal popups. |
| `dist/map.html` | Generated HTML + both embedded datasets | One file-URL demo selected with `?town=` and `?mode=`. |
| `build-maps.py` | Python 3 script | Regenerates all four `dist/` demos from the town datasets. |
| `vgsi_hillsborough_scrape.mjs` | Node.js script | Locally crawls the six Hillsborough VGSI portals and joins their records to the configured GIS parcel layers. |
| `data/weare/assessment-unmatched-avitar.csv` | CSV | Avitar records that did not match a GIS parcel. |
| `data/weare/assessment-unmatched-gis.csv` | CSV | GIS parcels that did not match an Avitar record. |
| `data/weare/parcels-*.geojson` | GeoJSON | Cached Weare parcel geometry subsets and sample data. |
| `data/weare/parcels-count.json` | JSON | Count metadata for the Weare parcel cache. |
| `data/weare/2026-uspap.pdf` | PDF | Avitar's 2026 USPAP/revaluation report. |
| `data/weare/2026-uspap.txt` | Plain text | Extracted text from the USPAP report for searching. |
| `data/bedford/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Bedford fork data, preserved in its original Vision schema. |
| `data/bedford/assessment-unmatched-gis.csv` | CSV | Bedford GIS polygons with no Vision record. |
| `data/bedford/assessment-unmatched-vision.csv` | CSV | Bedford Vision records with no GIS polygon. |
| `data/goffstown/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Goffstown parcel geometry plus locally parsed Vision assessment, land, building, feature, and recent history data. |
| `data/hollis/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Hollis parcel geometry plus locally parsed Vision assessment and property-record data. |
| `data/hudson/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Hudson parcel geometry plus locally parsed Vision assessment and property-record data. |
| `data/manchester/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Manchester parcel geometry plus locally parsed Vision assessment and property-record data. |
| `data/milford/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Milford parcel geometry plus locally parsed Vision assessment and property-record data. |
| `data/peterborough/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Peterborough parcel geometry plus locally parsed Vision assessment and property-record data. |

Each normal GeoJSON feature has polygon geometry and properties including `pid`, `owner`, `location`, `acres`, `class`, `v2025`, `v2026`, `increase`, `increase_pct`, `neighborhood`, `land`, `building`, and `features`. The canonical parcel identifier is the 18-digit PID, such as `000404000085000000`.

The `land` array contains land-line details such as type, units, base rate, neighborhood adjustment, site/road/driveway/topography/condition factors, ad-valorem value, current-use value, and notes. `building` contains the principal-building summary. `features` contains outbuildings and other assessed features.

### Source versus generated data

The maintainable `map.html` loads `data/<town>/assessment-parcels.geojson` at runtime. The individual `dist/` files contain a copy of the Weare data in `window.WEARE_DATA`; `dist/map.html` contains the enabled town datasets in `window.TOWN_DATA`, so it remains usable via `file:///`. Changing a CSV or GeoJSON source does not change the generated demos until you run:

```bash
python3 build-maps.py
```

After changing source data or map modes, validate the GeoJSON, regenerate all four demos, and test both the HTTP and `file:///` versions.

The normalized building data includes `quality` and, where available from cached Avitar records, `condition`. The quality view maps Avitar's `AVG`/`EXC` codes to the report's B5-to-A8 scale; missing building data is shown in gray.

Town and mode URL parameters are allowlisted by the map engine. Unknown values safely fall back to `town=weare` and `mode=assessment`; they are never interpolated into arbitrary filesystem paths. To add a town, add its data directory and explicitly add its name to the allowlist and build configuration.

### Multiple towns

Town-specific datasets belong in `data/<town>/` to prevent filename collisions. The Bedford files are preserved from `/tmp/bedford_map` without coercion or field renaming. They contain 7,630 Bedford polygons and use Vision Government Solutions, `v_prior`/`v_new`, `asr`, numeric Bedford neighborhood codes, and Bedford's own metadata. The shared engine now loads all eight completed town datasets for assessment, neighborhood, and quality views; Bedford's specialized assessment-to-sale ratio view remains fork-specific and is not exposed by the shared engine.

### Data acquisition

- **Amherst:** 2026-08-19; statewide NH parcel geometry joined to locally parsed Vision pages at `gis.vgsi.com/amherstnh`, stored under `data/amherst/`.
- **Bedford:** 2026-08-18; parcel geometry and assessment data from the Bedford Vision Government Solutions portal and the supplied fork data, preserved under `data/bedford/`.
- **Berlin:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/berlinnh`, stored under `data/berlin/`.
- **Bow:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/bownh`, stored under `data/bow/`.
- **Bridgewater:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/bridgewaternh`, stored under `data/bridgewater/`.
- **Charlestown:** 2026-08-19; statewide parcel geometry was obtained, but its statewide identifiers did not reliably match the town's VGSI map/lot identifiers; pending a town-specific join.
- **Claremont:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/claremontnh`, stored under `data/claremont/`.
- **Concord:** 2026-08-19; Concord's official ArcGIS parcel layer was joined directly by `VISION_ID` to locally parsed Vision pages at `gis.vgsi.com/concordnh`, stored under `data/concord/`.
- **Derry:** 2026-08-19; statewide parcel geometry was obtained, but its statewide identifiers did not reliably match the town's VGSI map/lot identifiers; pending a town-specific join.
- **Durham:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/durhamnh`, stored under `data/durham/`.
- **Epping:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/eppingnh`, stored under `data/epping/`.
- **Exeter:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/exeternh`, stored under `data/exeter/`.
- **Fremont:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/fremontnh`, stored under `data/fremont/`.
- **Goffstown:** 2026-08-19; parcel geometry and public GIS attributes from the town's ArcGIS parcel layer, joined by `D_GIS_CAMA_ID` to locally parsed Vision Government Solutions parcel pages at `gis.vgsi.com/goffstownnh`, stored under `data/goffstown/`.
- **Grantham:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/granthamnh`, stored under `data/grantham/`.
- **Greenland:** 2026-08-19; statewide parcel geometry was obtained, but its statewide identifiers did not reliably match the town's VGSI map/lot identifiers; pending a town-specific join.
- **Hampton:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/hamptonnh`, stored under `data/hampton/`.
- **Hollis:** 2026-08-19; NRPC ArcGIS parcel geometry joined by normalized `LAB_PID` to locally parsed Vision Government Solutions pages at `gis.vgsi.com/hollisnh`, stored under `data/hollis/`.
- **Hooksett:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/hooksettnh`, stored under `data/hooksett/`.
- **Hudson:** 2026-08-19; NRPC ArcGIS parcel geometry joined by normalized `LAB_PID` to locally parsed Vision Government Solutions pages at `gis.vgsi.com/hudsonnh`, stored under `data/hudson/`.
- **Jaffrey:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/jaffreynh`, stored under `data/jaffrey/`.
- **Keene:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/keenenh`, stored under `data/keene/`.
- **Laconia:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/laconianh`, stored under `data/laconia/`.
- **Lebanon:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/lebanonnh`, stored under `data/lebanon/`; some assessor requests were throttled.
- **Lincoln:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/lincolnnh`, stored under `data/lincoln/`.
- **Londonderry:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/londonderrynh`, stored under `data/londonderry/`.
- **Lyme:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/lymenh`, stored under `data/lyme/`.
- **Manchester:** 2026-08-19; official City of Manchester ArcGIS parcel geometry joined by `VisionPID` to locally parsed Vision Government Solutions pages at `gis.vgsi.com/manchesternh`, stored under `data/manchester/`.
- **Milford:** 2026-08-19; NRPC ArcGIS parcel geometry joined by normalized `LAB_PID` to locally parsed Vision Government Solutions pages at `gis.vgsi.com/milfordnh`, stored under `data/milford/`.
- **Meredith:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/meredithnh`, stored under `data/meredith/`.
- **Newmarket:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/newmarketnh`, stored under `data/newmarket/`.
- **Newington:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/newingtonnh`, stored under `data/newington/`.
- **North Hampton:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/northhamptonnh`, stored under `data/north_hampton/`.
- **Pelham:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/pelhamnh`, stored under `data/pelham/`.
- **Peterborough:** 2026-08-19; official `Pboro_RE_Dec2025` ArcGIS parcel geometry joined by normalized `PENTAMATIO` to locally parsed Vision Government Solutions pages at `gis.vgsi.com/peterboroughnh`, stored under `data/peterborough/`.
- **Portsmouth:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/portsmouthnh`, stored under `data/portsmouth/`.
- **Raymond:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/raymondnh`, stored under `data/raymond/`.
- **Rye:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/ryenh`, stored under `data/rye/`.
- **Salem:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/salemnh`, stored under `data/salem/`.
- **Seabrook:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/seabrooknh`, stored under `data/seabrook/`.
- **Strafford:** 2026-08-19; statewide NH parcel geometry joined by normalized `displayid` to locally parsed Vision pages at `gis.vgsi.com/straffordnh`, stored under `data/strafford/`.
- **Weare:** 2026-08-18; parcel geometry from NH GRANIT/UNH and assessment/property details from the Avitar portal, stored under `data/weare/`.

## Refreshing data with ChatGPT

The following prompts are useful starting points. Replace URLs, years, and filenames as needed.

### LLM scraping contract

An LLM doing a scrape must write town data under a town-specific directory:

```text
data/<town>/assessment-parcels.geojson
data/<town>/assessment-unmatched-gis.csv
data/<town>/assessment-unmatched-<assessor>.csv
```

Use a lowercase filesystem slug such as `weare` or `bedford`. Never write a new town's files into the shared `data/` directory, and never overwrite another town's files. Preserve raw scrape artifacts separately when they are needed for auditing.

The canonical parcel file must be a GeoJSON `FeatureCollection`. Each feature must have valid polygon geometry and properties containing, where the source provides them:

- `pid` or another documented stable parcel identifier, plus `displayid`/`objectid` when available
- `owner`, `owner2`, `location` or `streetaddress`, `acres`, and `class`
- prior and new assessment values, preferably as `v_prior`, `v_new`, `v_prior_label`, and `v_new_label`; use explicit year fields such as `v2025`/`v2026` when those years are genuinely known
- derived `increase` and `increase_pct` values, calculated from the stored prior/new values
- `neighborhood`, `land`, `building`, and `features` when available

The top-level GeoJSON should include `metadata` with the town, source URLs, scrape date, geometry source, assessment source, join key, feature count, matched count, and unmatched counts. Do not invent values for missing fields. Preserve source-specific fields such as Bedford's `asr` and Vision's numeric neighborhood codes.

For Bedford specifically, the assessment source is [Vision Government Solutions](https://gis.vgsi.com/bedfordnh/Search.aspx); the parcel geometry source and join key must also be recorded in `metadata`.

### Full refresh from GIS and assessor site

```text
In the nh_property_assessment project, scrape the current <TOWNNAME> GIS parcel geometries and the town's assessor property-record site. For Bedford, use https://gis.vgsi.com/bedfordnh/Search.aspx. Match records using the documented GIS/assessor join key; do not guess by address when an authoritative parcel identifier exists. Preserve all existing fields and add the requested prior/new assessment values plus derived increase fields. Produce:

1. `data/<town>/assessment-parcels.geojson` following the canonical contract above;
2. `data/<town>/assessment-unmatched-gis.csv` and an assessor-specific unmatched CSV;
3. metadata recording sources, dates, join key, counts, and schema details;
4. a dry-run report of matched, unmatched, changed, and suspicious records before replacement;
5. after approval, run `python3 build-maps.py` if the town is enabled in the build configuration.

Do not discard existing land, building, features, neighborhood, or popup fields. Write backups before replacing files, validate JSON, verify the feature count, and test both HTML files.
```

### Assessment-only refresh using existing geometry

```text
Using the existing `data/<town>/assessment-parcels.geojson` geometry, scrape the requested assessment data from the documented assessor source and match using the town's documented join key. Update only the assessment-year fields and derived increase fields; preserve geometry and all unrelated popup data. Write the result back under the same `data/<town>/` directory. Report matched, unmatched, changed, and suspicious counts before replacing anything.
```

### Validate a replacement dataset

```text
Audit the replacement files in `nh_property_assessment`. Check that every GeoJSON feature has valid polygon geometry and a valid documented parcel identifier where present. Do not assume PID uniqueness: multipart GIS geometries may legitimately repeat a PID; report duplicates and check `objectid`/feature identity instead. Verify that prior/new assessment fields and `increase`/`increase_pct` agree arithmetically, and that generated demos contain the same parcel counts and identifier set as the source GeoJSON. Check for malformed land/building/features data, metadata/source provenance, and unmatched reports; list discrepancies without silently fixing them.
```

### Deploy a refreshed map to WordPress

```text
The refreshed map files are in `nh_property_assessment`. Verify the shared HTTP version and all generated `dist/` demos locally, then copy `map.html`, `map.js`, `map.css`, and the needed `data/<town>/assessment-parcels.geojson` files to the WordPress site's public `/maps/` directory. Do not upload the large audit/cache files unless requested. Confirm the public URLs return the new maps and provide the iframe HTML for the WordPress Custom HTML block.
```

When asking ChatGPT to scrape, specify the desired map numbers, assessment years, source URLs, and whether existing records must be preserved. For a large refresh, ask for a dry-run report first; compare counts and a few known PIDs before authorizing replacement.

Keep this README current whenever files, modes, data fields, sources, or deployment steps change.

## Notes and limitations

- The maps use Leaflet and OpenStreetMap through external URLs, so Internet access is required for the basemap and Leaflet library.
- Assessment values are public-record estimates from the source systems; they are not an independent appraisal.
- Keep the source GeoJSON/CSV files separate from the deployed HTML files so the scrape can be audited and repeated.
- Keep backups of the previous HTML and source data before each refresh.
