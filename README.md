# NH Property Assessment Maps

This software project generates two different scrollable, zoomable, click-able maps that allow exploration of property tax assessment data.

It is currently configured with data scraped from Avitar Associates for Weare, NH, but there are instructions in this file on how to use LLM assistance to scrape data for your own town and customize this app.

This directory contains a reusable map engine plus two generated, standalone Leaflet maps of New Hampshire parcels.

- `map.html` is the maintainable HTTP/WordPress entry point. Use `?mode=assessment` or `?mode=neighborhood`.
- `dist/assessment-map.html` colors parcels by the percentage increase from 2025 to 2026 assessment.
- `dist/neighborhood-map.html` colors parcels by Avitar neighborhood classification.
- `map.js` is the shared engine; `map.css` is the shared stylesheet.

The maps show parcel outlines, assessment values, owners, location, land lines, building data, features, and other information available from the local GIS and Avitar property-record pages.

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
http://localhost:8000/map.html?mode=assessment
http://localhost:8000/map.html?mode=neighborhood
```

## Host in WordPress

The maps are static HTML applications. They do not need a WordPress plugin, PHP, a database, or a build step.

You can host them "on the metal" on any webserver and have nginx, Apache, or similar serve the files. Or, if you already have WordPress installed, you can serve them in an iframe inside a WordPress "page". Instructions on this follow.

1. Create a directory such as `maps` in the public document root of the WordPress site.
2. Upload `map.html`, `map.js`, `map.css`, and `data/assessment-parcels.geojson` there, preserving the `data/` subdirectory.
3. Visit the resulting URL, for example:

   ```text
   https://example.com/maps/map.html?mode=assessment
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

Use `?mode=neighborhood` for the second map. Alternatively, upload the generated files from `dist/` if you want a single self-contained HTML artifact with embedded data. Uploading through the normal WordPress Media Library may reject `.html` files; server-side upload is the appropriate method. Make sure the site permits the iframe source and that the server serves `.html` as a normal text/HTML file.

## Data files

| File | Format | Purpose |
|---|---|---|
| `map.html` | HTML shell | HTTP/WordPress entry point; selects the view with `?mode=`. |
| `map.js` | JavaScript | Shared map engine. |
| `map.css` | CSS | Shared map and legend styling. |
| `data/assessment-parcels.geojson` | GeoJSON `FeatureCollection` | Canonical enriched parcel geometry and assessment dataset loaded by the engine. |
| `dist/assessment-map.html` | Generated HTML + embedded GeoJSON | File-URL assessment-increase demo. |
| `dist/neighborhood-map.html` | Generated HTML + embedded GeoJSON | File-URL neighborhood-rating demo. |
| `build-maps.py` | Python 3 script | Regenerates both `dist/` demos from the canonical GeoJSON. |
| `data/assessment-unmatched-avitar.csv` | CSV | Avitar records that did not match a GIS parcel. |
| `data/assessment-unmatched-gis.csv` | CSV | GIS parcels that did not match an Avitar record. |
| `data/parcels-*.geojson` | GeoJSON | Cached parcel geometry subsets and sample data. |
| `data/parcels-count.json` | JSON | Count metadata for the parcel cache. |
| `data/2026-uspap.pdf` | PDF | Avitar's 2026 USPAP/revaluation report. |
| `data/2026-uspap.txt` | Plain text | Extracted text from the USPAP report for searching. |

Each normal GeoJSON feature has polygon geometry and properties including `pid`, `owner`, `location`, `acres`, `class`, `v2025`, `v2026`, `increase`, `increase_pct`, `neighborhood`, `land`, `building`, and `features`. The canonical parcel identifier is the 18-digit PID, such as `000404000085000000`.

The `land` array contains land-line details such as type, units, base rate, neighborhood adjustment, site/road/driveway/topography/condition factors, ad-valorem value, current-use value, and notes. `building` contains the principal-building summary. `features` contains outbuildings and other assessed features.

### Source versus generated data

The maintainable `map.html` loads `data/assessment-parcels.geojson` at runtime. The `dist/` files contain a copy of that data in `window.WEARE_DATA` so they remain usable via `file:///`. Changing a CSV or GeoJSON source does not change the generated demos until you run:

```bash
python3 build-maps.py
```

After changing source data, validate the GeoJSON, regenerate both demos, and test both the HTTP and `file:///` versions.

## Refreshing data with ChatGPT

The following prompts are useful starting points. Replace URLs, years, and filenames as needed.

### Full refresh from GIS and Avitar

```text
In the nh_property_assessment project, scrape the current <TOWNNAME> GIS parcel geometries and the Avitar property records for the requested map numbers. Match records by the canonical 18-digit PID. Preserve all existing fields and add the new assessment year as v2027 (or the requested year), increase, and increase_pct. Produce:

1. a validated FeatureCollection named data/assessment-parcels.geojson;
2. unmatched-avitar and unmatched-gis CSV reports;
3. run `python3 build-maps.py` to regenerate both `dist/` demos;
4. verify `map.html?mode=assessment` and `map.html?mode=neighborhood` against the same external dataset.

Do not discard existing land, building, features, neighborhood, or popup fields. Write backups before replacing files, validate JSON, verify the feature count, and test both HTML files.
```

### Assessment-only refresh using existing geometry

```text
Using the existing data/assessment-parcels.geojson geometry, scrape the requested year's Avitar assessments and match by 18-digit PID. Update only the year-specific assessment fields and derived increase fields; preserve geometry and all unrelated popup data. Run `python3 build-maps.py` so the file-URL demos match the external GeoJSON. Report matched, unmatched, and changed counts before replacing anything.
```

### Validate a replacement dataset

```text
Audit the replacement files in nh_property_assessment. Check that every GeoJSON feature has valid polygon geometry and a valid 18-digit pid where present. Do not assume PID uniqueness: multipart GIS geometries may legitimately repeat a PID; report duplicates and check `objectid`/feature identity instead. Verify that v2025/v2026/increase/increase_pct agree arithmetically, and that the external GeoJSON and both generated HTML demos contain the same parcel count and PID set. Check for malformed land/building/features data and list discrepancies without silently fixing them.
```

### Deploy a refreshed map to WordPress

```text
The refreshed map files are in nh_property_assessment. Verify the shared HTTP version and both generated `dist/` demos locally, then copy `map.html`, `map.js`, `map.css`, and `data/assessment-parcels.geojson` to the WordPress site's public `/maps/` directory. Do not upload the large audit/cache files unless requested. Confirm the public URLs return the new map and provide the iframe HTML for the WordPress Custom HTML block.
```

When asking ChatGPT to scrape, specify the desired map numbers, assessment years, source URLs, and whether existing records must be preserved. For a large refresh, ask for a dry-run report first; compare counts and a few known PIDs before authorizing replacement.

## Notes and limitations

- The maps use Leaflet and OpenStreetMap through external URLs, so Internet access is required for the basemap and Leaflet library.
- Assessment values are public-record estimates from the source systems; they are not an independent appraisal.
- Keep the source GeoJSON/CSV files separate from the deployed HTML files so the scrape can be audited and repeated.
- Keep backups of the previous HTML and source data before each refresh.
