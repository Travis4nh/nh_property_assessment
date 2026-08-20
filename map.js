/* Shared Weare parcel map engine. Data may be embedded for file:/// demos or fetched over HTTP. */
(async function () {
  const params = new URLSearchParams(location.search);
  const allowedTowns = new Set(window.AVAILABLE_TOWNS || ['amherst','bedford','berlin','bow','bridgewater','claremont','durham','epping','exeter','fremont','goffstown','grantham','hampton','hollis','hooksett','hudson','jaffrey','keene','laconia','lebanon','lincoln','londonderry','lyme','manchester','meredith','milford','newington','newmarket','north_hampton','pelham','peterborough','portsmouth','raymond','rye','salem','seabrook','strafford','weare']);
  const requestedTown = (window.TOWN || params.get('town') || 'weare').toLowerCase();
  const town = allowedTowns.has(requestedTown) ? requestedTown : 'weare';
  const allowedModes = new Set(['assessment', 'neighborhood', 'quality']);
  const requestedMode = window.MODE || window.WEARE_MODE || params.get('mode') || 'assessment';
  const mode = allowedModes.has(requestedMode) ? requestedMode : 'assessment';
  const embedded = window.TOWN_DATA?.[town] || (town === 'weare' ? window.WEARE_DATA : null);
  const data = embedded || await fetch(window.DATA_URL || `data/${town}/assessment-parcels.geojson`).then(r => {
    if (!r.ok) throw new Error(`Unable to load parcel data: ${r.status}`);
    return r.json();
  });
  const townName = data.metadata?.town || (town[0].toUpperCase() + town.slice(1));

  const map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors; parcels from NH GRANIT/UNH; assessments from Avitar scrape'
  }).addTo(map);

  const neighborhoodColors = {
    'AVERAGE-40': '#b2182b', 'AVERAGE-30': '#d6604d',
    'AVERAGE-20': '#f4a582', 'AVERAGE-10': '#fddbc7',
    'AVERAGE': '#ffffbf', 'AVERAGE+10': '#d9f0d3',
    'AVERAGE+20': '#7fbf7b', 'BACKLAND': '#92a8b8'
  };
  const increaseColors = [
    ['#2b83ba', '< 0%'], ['#abdda4', '0-30%'], ['#ffffbf', '30-45%'],
    ['#fdae61', '45-60%'], ['#f46d43', '60-100%'],
    ['#a50026', '>= 100%'], ['#cfcfcf', 'no Avitar match']
  ];
  const qualityColors = [
    ['#67001f', 'B5 / AVG-50'], ['#a50f15', 'B4 / AVG-40'],
    ['#d7301f', 'B3 / AVG-30'], ['#ef6548', 'B2 / AVG-20'],
    ['#fdbb84', 'B1 / AVG-10'], ['#ffffbf', 'A0 / AVG'],
    ['#d9f0a3', 'A1 / AVG+10'], ['#addd8e', 'A2 / AVG+20'],
    ['#78c679', 'A3 / AVG+30'], ['#41ab5d', 'A4 / EXC'],
    ['#238443', 'A5 / EXC+10'], ['#006837', 'A6 / EXC+20'],
    ['#005a32', 'A7 / EXC+40'], ['#004529', 'A8 / EXC+60'],
    ['#cfcfcf', 'no quality data']
  ];
  const qualityCode = {
    'AVG-50': 'B5', 'AVG-40': 'B4', 'AVG-30': 'B3', 'AVG-20': 'B2',
    'AVG-10': 'B1', 'AVG': 'A0', 'AVG+10': 'A1', 'AVG+20': 'A2',
    'AVG+30': 'A3', 'EXC': 'A4', 'EXC+10': 'A5', 'EXC+20': 'A6',
    'EXC+40': 'A7', 'EXC+60': 'A8'
  };
  const qualityFill = {
    B5: '#67001f', B4: '#a50f15', B3: '#d7301f', B2: '#ef6548',
    B1: '#fdbb84', A0: '#ffffbf', A1: '#d9f0a3', A2: '#addd8e',
    A3: '#78c679', A4: '#41ab5d', A5: '#238443', A6: '#006837',
    A7: '#005a32', A8: '#004529'
  };

  function neighborhoodColor(value) { return neighborhoodColors[value] || '#cfcfcf'; }
  function bedfordNeighborhoodColor(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '#cfcfcf';
    const stops = [[30, '#d73027'], [50, '#fc8d59'], [70, '#fee08b'], [90, '#91cf60'], [110, '#1a9850']];
    const nearest = stops.reduce((a, b) => Math.abs(b[0] - n) < Math.abs(a[0] - n) ? b : a);
    return nearest[1];
  }
  function qualityColor(value) { return qualityFill[qualityCode[value] || value] || '#cfcfcf'; }
  function increaseColor(p) {
    if (p.fill) return p.fill;
    const n = Number(p.increase_pct);
    if (!Number.isFinite(n)) return '#cfcfcf';
    return n < 0 ? '#2b83ba' : n < .30 ? '#abdda4' : n < .45 ? '#ffffbf' : n < .60 ? '#fdae61' : n < 1 ? '#f46d43' : '#a50026';
  }
  function esc(x) { return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function style(feature) {
    const p = feature.properties;
    return { color: '#444', weight: 0.6,
      fillColor: mode === 'neighborhood' ? (town === 'bedford' ? bedfordNeighborhoodColor(p.neighborhood) : neighborhoodColor(p.neighborhood)) :
        mode === 'quality' ? qualityColor((p.building || {}).quality) : increaseColor(p),
      fillOpacity: 0.72 };
  }

  function popup(p) {
    if (mode === 'quality') {
      const b = p.building || {};
      return `<b>${esc(p.streetaddress || p.location || p.displayid || p.pid)}</b><br>
        PID: ${esc(p.pid)}<br>
        Owner: ${esc([p.owner, p.owner2].filter(Boolean).join(' '))}<br>
        Acres: ${esc(p.acres)}<br>
        <b>QUALITY:</b> ${esc(b.quality || 'not recorded')}<br>
        <b>CONDITION:</b> ${esc(b.condition || 'not recorded')}`;
    }
    return `<b>${esc(p.streetaddress || p.location || p.displayid || p.pid)}</b><br>
      PID: ${esc(p.pid)}<br>
      Owner: ${esc(p.owner)} ${esc(p.owner2)}<br>
      Prior: ${esc(p.v2025_label || p.v_prior_label)}<br>
      New: ${esc(p.v2026_label || p.v_new_label)}<br>
      Increase: ${esc(p.increase_label || p.increase_pct_label)}<br>
      Acres: ${esc(p.acres)}; class: ${esc(p.class)}<br>Neighborhood: ${esc(p.neighborhood || '')}
      ${p.land?.length ? `<hr><b>Land</b><br>${p.land.map((x, i) => `${i + 1}. ${esc(x.type)}; ${esc(x.units)}; base ${esc(x.base)}; NC ${esc(x.nc)}/${esc(x.adj)}; site ${esc(x.site)}; road ${esc(x.road)}; driveway ${esc(x.dway)}; topo ${esc(x.topo)}; condition ${esc(x.cond)}; taxable ${esc(x.tax)}`).join('<br>')}` : ''}
      ${p.building ? `<hr><b>Building</b><br>${esc(p.building.title)}; ${esc(p.building.gross_living)} GLA; ${esc(p.building.bedrooms)} bd / ${esc(p.building.bathrooms)} ba; quality ${esc(p.building.quality)}; value ${esc(p.building.value)}; cost new ${esc(p.building.cost_new)}; depreciation ${esc(p.building.depreciation)}%` : ''}
      ${p.features?.length ? `<hr><b>Features</b> (${esc(p.features_value)})<br>${p.features.map(x => `${esc(x.type)}; ${esc(x.units)}; ${esc(x.value)}${x.notes ? ` (${esc(x.notes)})` : ''}`).join('<br>')}` : (p.features_value ? `<hr><b>Features:</b> ${esc(p.features_value)}` : '')}`;
  }

  const layer = L.geoJSON(data, {
    style,
    onEachFeature: (feature, layer) => layer.bindPopup(popup(feature.properties))
  }).addTo(map);
  map.fitBounds(layer.getBounds());

  const legend = L.control({position: 'bottomright'});
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
    const rows = mode === 'neighborhood' ? (town === 'bedford' ? [['#d73027', '30'], ['#fc8d59', '50'], ['#fee08b', '70'], ['#91cf60', '90'], ['#1a9850', '110']] : Object.entries(neighborhoodColors)).concat([['#cfcfcf', 'no rating']])
      : mode === 'quality' ? qualityColors : increaseColors;
    div.innerHTML = `<b>${mode === 'neighborhood' ? 'Neighborhood rating' : mode === 'quality' ? 'Building quality' : 'Assessment increase'}</b><br>` +
      rows.map(r => `<i style="background:${r[0]}"></i>${r[1]}`).join('<br>');
    return div;
  };
  legend.addTo(map);

  const note = L.control({position: 'topleft'});
  note.onAdd = function () {
    const div = L.DomUtil.create('div', 'note');
    div.innerHTML = `<b>${townName} ${mode === 'neighborhood' ? 'neighborhood rating' : mode === 'quality' ? 'building quality' : 'assessment increase'} map</b><br>${data.features.length.toLocaleString()} mapped GIS parcels.`;
    return div;
  };
  note.addTo(map);
})().catch(error => {
  document.getElementById('map').textContent = `Map failed to load: ${error.message}`;
  console.error(error);
});
