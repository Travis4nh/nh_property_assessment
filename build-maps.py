#!/usr/bin/env python3
"""Build file:/// demos from the canonical external parcel dataset."""
import json
from pathlib import Path

ROOT = Path(__file__).parent
DATA = json.loads((ROOT / 'data/assessment-parcels.geojson').read_text())
PAYLOAD = json.dumps(DATA, separators=(',', ':'))

def page(mode, title):
    return f'''<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="../map.css"></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>window.WEARE_MODE={mode!r}; window.WEARE_DATA={PAYLOAD};</script>
<script src="../map.js"></script></body></html>
'''

out = ROOT / 'dist'
out.mkdir(exist_ok=True)
(out / 'assessment-map.html').write_text(page('assessment', 'Weare 2026 Assessment Increase Map'))
(out / 'neighborhood-map.html').write_text(page('neighborhood', 'Weare Neighborhood Rating Map'))
print(f'generated {len(DATA["features"]):,} parcels')
