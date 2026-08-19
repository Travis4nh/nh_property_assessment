/* Shared Weare parcel map engine. Data may be embedded for file:/// demos or fetched over HTTP. */
(async function () {
  const mode = window.WEARE_MODE || new URLSearchParams(location.search).get('mode') || 'assessment';
  const data = window.WEARE_DATA || await fetch(window.WEARE_DATA_URL || 'data/assessment-parcels.geojson').then(r => {
    if (!r.ok) throw new Error(`Unable to load parcel data: ${r.status}`);
    return r.json();
  });

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

  function neighborhoodColor(value) { return neighborhoodColors[value] || '#cfcfcf'; }
  function esc(x) { return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function style(feature) {
    return { color: '#444', weight: 0.6,
      fillColor: mode === 'neighborhood' ? neighborhoodColor(feature.properties.neighborhood) : (feature.properties.fill || '#cfcfcf'),
      fillOpacity: 0.72 };
  }

  function popup(p) {
    return `<b>${esc(p.streetaddress || p.location || p.displayid || p.pid)}</b><br>
      PID: ${esc(p.pid)}<br>
      Owner: ${esc(p.owner)} ${esc(p.owner2)}<br>
      2025: ${esc(p.v2025_label)}<br>
      2026: ${esc(p.v2026_label)}<br>
      Increase: ${esc(p.increase_label)} (${esc(p.increase_pct_label)})<br>
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
    const rows = mode === 'neighborhood'
      ? Object.entries(neighborhoodColors).concat([['#cfcfcf', 'no rating']])
      : increaseColors;
    div.innerHTML = `<b>${mode === 'neighborhood' ? 'Avitar neighborhood rating' : '2025 to 2026 increase'}</b><br>` +
      rows.map(r => `<i style="background:${r[0]}"></i>${r[1]}`).join('<br>');
    return div;
  };
  legend.addTo(map);

  const note = L.control({position: 'topleft'});
  note.onAdd = function () {
    const div = L.DomUtil.create('div', 'note');
    div.innerHTML = `<b>Weare ${mode === 'neighborhood' ? 'neighborhood rating' : 'assessment increase'} map</b><br>${data.features.length.toLocaleString()} mapped GIS parcels.`;
    return div;
  };
  note.addTo(map);
})().catch(error => {
  document.getElementById('map').textContent = `Map failed to load: ${error.message}`;
  console.error(error);
});
