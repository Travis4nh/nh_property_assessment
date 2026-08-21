/* Shared Weare parcel map engine. Data may be embedded for file:/// demos or fetched over HTTP. */
(async function () {
  const params = new URLSearchParams(location.search);
  const allowedTowns = new Set(window.AVAILABLE_TOWNS || ['amherst','bedford','berlin','bow','bridgewater','claremont','durham','epping','exeter','fremont','goffstown','grantham','hampton','hollis','hooksett','hudson','jaffrey','keene','laconia','lebanon','lincoln','londonderry','lyme','manchester','meredith','milford','newington','newmarket','north_hampton','pelham','peterborough','portsmouth','raymond','rye','salem','seabrook','strafford','weare']);
  const requestedTown = (window.TOWN || params.get('town') || 'weare').toLowerCase();
  const defaultTown = allowedTowns.has('weare') ? 'weare' : ([...allowedTowns][0] || 'weare');
  const town = allowedTowns.has(requestedTown) ? requestedTown : defaultTown;
  const allowedModes = new Set(['assessment', 'neighborhood', 'quality', 'ratio', 'history']);
  const requestedMode = window.MODE || window.WEARE_MODE || params.get('mode') || 'assessment';
  const mode = allowedModes.has(requestedMode) ? requestedMode : 'assessment';
  /* Single-town demos carry their payload in WEARE_DATA whatever the slug, so accept it for the town window.TOWN names. */
  const embeddedTown = String(window.TOWN || 'weare').toLowerCase();
  const embedded = window.TOWN_DATA?.[town] || (town === 'weare' || town === embeddedTown ? window.WEARE_DATA : null);
  const data = embedded || await fetch(window.DATA_URL || `data/${town}/assessment-parcels.geojson`).then(r => {
    if (!r.ok) throw new Error(`Unable to load parcel data: ${r.status}`);
    return r.json();
  });
  const townName = data.metadata?.town || (town[0].toUpperCase() + town.slice(1));

  /* Years the slider can offer: any year with a prior year to compare against. */
  const yearsPresent = new Set();
  for (const feature of data.features || []) {
    const p = feature.properties || {};
    for (const row of Array.isArray(p.value_history) ? p.value_history : []) {
      const y = Number(row && row.year);
      if (Number.isFinite(y)) yearsPresent.add(y);
    }
    if (p.v2026 !== null && p.v2026 !== undefined && p.v2026 !== '') yearsPresent.add(2026);
  }
  const sortedYears = [...yearsPresent].sort((a, b) => a - b);
  /* Drop the earliest: with no year before it there is nothing to measure change against. */
  const historyYears = sortedYears.slice(1);
  const requestedYear = Number(params.get('year'));
  let historyYear = historyYears.includes(requestedYear)
    ? requestedYear
    : (historyYears[historyYears.length - 1] ?? null);

  const map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors; parcels from NH GRANIT/UNH; assessments from Avitar scrape'
  }).addTo(map);

  const modeTitles = {
    assessment: 'assessment increase', neighborhood: 'neighborhood rating',
    quality: 'building quality', ratio: '2026 value / sale price',
    history: 'year-over-year change'
  };
  const legendTitles = {
    assessment: 'Assessment increase', neighborhood: 'Neighborhood rating',
    quality: 'Building quality', ratio: '2026 value &divide; qualified sale price',
    history: 'Year-over-year change'
  };
  const neighborhoodColors = {
    'AVERAGE-40': '#b2182b', 'AVERAGE-30': '#d6604d',
    'AVERAGE-20': '#f4a582', 'AVERAGE-10': '#fddbc7',
    'AVERAGE': '#ffffbf', 'AVERAGE+10': '#d9f0d3',
    'AVERAGE+20': '#7fbf7b', 'AVERAGE+30': '#5aae61',
    'AVERAGE+40': '#41ab5d', 'AVERAGE+50': '#238b45',
    'AVERAGE+60': '#00702f', 'AVERAGE+70': '#005a26',
    'AVERAGE+80': '#00441b', 'BACKLAND': '#92a8b8'
  };
  const increaseColors = [
    ['#2b83ba', '< 0%'], ['#abdda4', '0-30%'], ['#ffffbf', '30-45%'],
    ['#fdae61', '45-60%'], ['#f46d43', '60-100%'],
    ['#a50026', '>= 100%'], ['#cfcfcf', 'no Avitar match']
  ];
  const ratioColors = [
    ['#2166ac', '&lt; 0.70'], ['#67a9cf', '0.70&ndash;0.85'],
    ['#d1e5f0', '0.85&ndash;0.95'], ['#ffffbf', '0.95&ndash;1.05'],
    ['#fdae61', '1.05&ndash;1.15'], ['#f46d43', '1.15&ndash;1.30'],
    ['#a50026', '&ge; 1.30'], ['#cfcfcf', 'no qualified sale since 2023']
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

  /* Number(null) and Number('') are 0, which would silently bucket missing data as a real value. */
  function has(value) { return value !== null && value !== undefined && value !== ''; }
  function numOrNull(value) {
    if (!has(value)) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function neighborhoodColor(value) { return neighborhoodColors[value] || '#cfcfcf'; }
  function bedfordNeighborhoodColor(value) {
    const n = numOrNull(value);
    if (n === null) return '#cfcfcf';
    const stops = [[30, '#d73027'], [50, '#fc8d59'], [70, '#fee08b'], [90, '#91cf60'], [110, '#1a9850']];
    const nearest = stops.reduce((a, b) => Math.abs(b[0] - n) < Math.abs(a[0] - n) ? b : a);
    return nearest[1];
  }
  function qualityColor(value) { return qualityFill[qualityCode[value] || value] || '#cfcfcf'; }
  /* Shared by the assessment view and the history slider so both read against one legend. */
  function increaseFill(n) {
    if (n === null) return '#cfcfcf';
    return n < 0 ? '#2b83ba' : n < .30 ? '#abdda4' : n < .45 ? '#ffffbf' : n < .60 ? '#fdae61' : n < 1 ? '#f46d43' : '#a50026';
  }
  function increaseColor(p) {
    if (p.fill) return p.fill;
    return increaseFill(numOrNull(p.increase_pct));
  }

  /* Year-over-year change from the parcel's own value_history, for the slider. A parcel with no
     row for `year`, or none for year-1, has no computable change and stays grey -- a parcel that
     did not exist yet must not read as "0% change". */
  function historyIndex(p) {
    if (p.__hist) return p.__hist;
    const idx = {};
    for (const row of Array.isArray(p.value_history) ? p.value_history : []) {
      const y = numOrNull(row && row.year);
      const total = numOrNull(row && row.total);
      if (y !== null && total !== null) idx[y] = total;
    }
    /* v2026 is the live book and is not part of value_history; fold it in so the slider reaches it. */
    const latest = numOrNull(p.v2026);
    if (latest !== null) idx[2026] = latest;
    Object.defineProperty(p, '__hist', { value: idx, enumerable: false });
    return idx;
  }
  function historyChange(p, year) {
    const idx = historyIndex(p);
    const now = idx[year];
    const prior = idx[year - 1];
    if (now === undefined || prior === undefined || prior <= 0) return null;
    return now / prior - 1;
  }
  function historyColor(p, year) { return increaseFill(historyChange(p, year)); }
  function ratio(p) {
    const n = numOrNull(p.ratio_2026);
    return n !== null && n > 0 ? n : null;
  }
  function ratioColor(p) {
    const n = ratio(p);
    if (n === null) return '#cfcfcf';
    return n < .70 ? '#2166ac' : n < .85 ? '#67a9cf' : n < .95 ? '#d1e5f0' : n < 1.05 ? '#ffffbf' : n < 1.15 ? '#fdae61' : n < 1.30 ? '#f46d43' : '#a50026';
  }
  function esc(x) { return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function usd(value) {
    if (!has(value)) return '';
    const n = numOrNull(value);
    return n === null ? String(value) : `$${Math.round(n).toLocaleString('en-US')}`;
  }
  function num(value) {
    if (!has(value)) return '';
    const n = numOrNull(value);
    return n === null ? String(value) : n.toLocaleString('en-US');
  }
  function style(feature) {
    const p = feature.properties;
    return { color: '#444', weight: 0.6,
      fillColor: mode === 'neighborhood' ? (town === 'bedford' ? bedfordNeighborhoodColor(p.neighborhood) : neighborhoodColor(p.neighborhood)) :
        mode === 'quality' ? qualityColor((p.building || {}).quality) :
        mode === 'ratio' ? ratioColor(p) :
        mode === 'history' ? historyColor(p, historyYear) : increaseColor(p),
      fillOpacity: 0.72 };
  }

  /* Condo / multi-card parcels: one polygon can carry several assessor cards. */
  function unitsBlock(p) {
    const count = numOrNull(p.units_count);
    if (count === null || count <= 1) return '';
    const rows = (p.units || []).map(u => {
      const extra = [has(u.acres) ? `${esc(u.acres)} ac` : '', has(u.land_value) ? `land ${esc(usd(u.land_value))}` : ''].filter(Boolean).join('; ');
      return `${esc(u.pid || u.norm || '')}${u.owner ? ` &mdash; ${esc(u.owner)}` : ''}: ${esc(usd(u.v2025))} &rarr; ${esc(usd(u.v2026))}${extra ? ` (${extra})` : ''}`;
    }).join('<br>');
    return `<hr><b>Units on this parcel:</b> ${esc(count)}${rows ? `<br>${rows}` : ''}`;
  }

  /* In history mode, spell out the two years the colour is actually derived from. */
  function selectedYearBlock(p) {
    if (mode !== 'history' || historyYear === null) return '';
    const idx = historyIndex(p);
    const now = idx[historyYear];
    const prior = idx[historyYear - 1];
    const change = historyChange(p, historyYear);
    if (change === null) {
      return `<hr><b>${esc(historyYear - 1)} &rarr; ${esc(historyYear)}:</b> not assessed in both years`;
    }
    const pct = `${(change * 100).toFixed(1)}%`;
    return `<hr><b>${esc(historyYear - 1)} &rarr; ${esc(historyYear)}:</b> ` +
      `${esc(usd(prior))} &rarr; ${esc(usd(now))} (${esc(pct)})`;
  }

  /* Compact "2025 $491,700 &middot; 2024 $685,700 &middot; ..." line, most recent six years. */
  function historyBlock(p) {
    const rows = (Array.isArray(p.value_history) ? p.value_history : [])
      .filter(x => x && x.year !== null && x.year !== undefined)
      .slice()
      .sort((a, b) => Number(b.year) - Number(a.year))
      .slice(0, 6);
    if (!rows.length) return '';
    return `<hr><b>Value history</b><br>${rows.map(x => `${esc(x.year)} ${esc(usd(x.total))}`).join(' &middot; ')}`;
  }

  function saleBlock(p) {
    /* Assessors flag some $1 family/trust transfers "qualified". The ratio divides by the most
       recent arm's-length sale instead, so show that one when the two differ. */
    const arms = p.last_arms_length_sale;
    const q = has(arms?.date) || has(arms?.price) ? arms : p.last_qualified_sale;
    const qualified = q && (has(q.date) || has(q.price)) ? q : null;
    const sale = qualified || (has(p.sale_date) || has(p.sale_price) ? { date: p.sale_date, price: p.sale_price ?? p.sale_price_label } : null);
    const n = ratio(p);
    if (!sale) return mode === 'ratio' ? '<hr><b>Sale:</b> no qualified sale since 2023' : '';
    const label = qualified ? 'Last qualified sale' : 'Last recorded sale';
    /* A missing ratio has three different causes; say which one rather than always blaming the date. */
    const before2023 = has(sale.date) && String(sale.date) < '2023-01-01';
    const why = before2023 ? ' (sale before 2023)' : (numOrNull(sale.price) ? '' : ' (price not recorded)');
    const unit = has(p.ratio_unit_norm) ? ` (unit ${esc(p.ratio_unit_norm)})` : '';
    const ratioLine = n !== null ? `<br><b>2026 value / sale price:</b> ${esc(n.toFixed(2))}${unit}`
      : (mode === 'ratio' ? `<br><b>2026 value / sale price:</b> not computed${why}` : '');
    /* A $0 price is a nominal transfer, not a sale price: show the sale, but do not print "$0". */
    return `<hr><b>${label}:</b> ${esc(has(sale.date) ? sale.date : 'date not recorded')}; ${esc(numOrNull(sale.price) ? usd(sale.price) : 'price not recorded')}${ratioLine}`;
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
    const b = p.building;
    /* A parcel joined from several GRANIT polygons keeps the part count (and its objectids) on the feature. */
    const parts = numOrNull(p.polygon_parts) ?? (Array.isArray(p.objectids) ? p.objectids.length : 0);
    /* Avitar building titles usually read "... Built In 1978"; only add the year when they do not. */
    const built = b?.year_built && !String(b.title ?? '').includes(String(b.year_built)) ? `; built ${esc(b.year_built)}` : '';
    return `<b>${esc(p.streetaddress || p.location || p.displayid || p.pid)}</b><br>
      PID: ${esc(p.pid)}<br>
      Owner: ${esc(p.owner)} ${esc(p.owner2)}<br>
      Prior: ${esc(p.v2025_label || usd(p.v2025) || p.v_prior_label || usd(p.v_prior))}<br>
      New: ${esc(p.v2026_label || usd(p.v2026) || p.v_new_label || usd(p.v_new))}<br>
      Increase: ${esc(p.increase_label || usd(p.increase))} ${esc(p.increase_pct_label || '')}<br>
      Acres: ${esc(p.acres)}; class: ${esc(p.class)}${parts > 1 ? `; multipart: ${esc(parts)} polygons` : ''}<br>Neighborhood: ${esc(p.neighborhood || '')}
      ${unitsBlock(p)}
      ${saleBlock(p)}
      ${selectedYearBlock(p)}
      ${historyBlock(p)}
      ${p.land?.length ? `<hr><b>Land</b><br>${p.land.map((x, i) => `${i + 1}. ${esc(x.type)}; ${esc(x.units)}; base ${esc(x.base)}; NC ${esc(x.nc)}/${esc(x.adj)}; site ${esc(x.site)}; road ${esc(x.road)}; driveway ${esc(x.dway)}; topo ${esc(x.topo)}; condition ${esc(x.cond)}; taxable ${esc(x.tax)}`).join('<br>')}` : ''}
      ${b ? `<hr><b>Building</b><br>${esc(b.title)}${built}; ${esc(num(b.gross_living))} GLA; ${esc(b.bedrooms)} bd / ${esc(b.bathrooms)} ba; quality ${esc(b.quality)}; value ${esc(usd(b.value))}; cost new ${esc(usd(b.cost_new))}; depreciation ${esc(b.depreciation)}%` : ''}
      ${p.features?.length ? `<hr><b>Features</b> (${esc(p.features_value)})<br>${p.features.map(x => `${esc(x.type)}; ${esc(x.units)}; ${esc(usd(x.value))}${x.notes ? ` (${esc(x.notes)})` : ''}`).join('<br>')}` : (p.features_value ? `<hr><b>Features:</b> ${esc(p.features_value)}` : '')}`;
  }

  const layer = L.geoJSON(data, {
    style,
    onEachFeature: (feature, layer) => layer.bindPopup(() => popup(feature.properties))
  }).addTo(map);
  map.fitBounds(layer.getBounds());

  /* Neighborhood legend lists only the palette codes actually present in this town's data. */
  function neighborhoodRows() {
    const present = new Set();
    for (const feature of data.features || []) {
      const value = feature.properties?.neighborhood;
      if (value) present.add(String(value));
    }
    const entries = Object.entries(neighborhoodColors);
    const found = entries.filter(([code]) => present.has(code));
    return (found.length ? found : entries).map(([code, color]) => [color, code]);
  }

  const legend = L.control({position: 'bottomright'});
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
    const historyRows = increaseColors.slice(0, -1).concat([['#cfcfcf', 'not assessed both years']]);
    const rows = mode === 'neighborhood' ? (town === 'bedford' ? [['#d73027', '30'], ['#fc8d59', '50'], ['#fee08b', '70'], ['#91cf60', '90'], ['#1a9850', '110']] : neighborhoodRows()).concat([['#cfcfcf', 'no rating']])
      : mode === 'quality' ? qualityColors
      : mode === 'ratio' ? ratioColors
      : mode === 'history' ? historyRows : increaseColors;
    div.innerHTML = `<b>${legendTitles[mode]}</b><br>` +
      rows.map(r => `<i style="background:${r[0]}"></i>${r[1]}`).join('<br>');
    return div;
  };
  legend.addTo(map);

  const note = L.control({position: 'topleft'});
  let noteDiv = null;
  function noteHtml() {
    const base = `<b>${esc(townName)} ${modeTitles[mode]} map</b><br>${data.features.length.toLocaleString()} mapped GIS parcels.`;
    if (mode === 'ratio' && !(data.features || []).some(f => ratio(f.properties || {}) !== null)) {
      return `${base}<br>No parcel in this dataset carries <code>ratio_2026</code>, so no sale ratio can be ` +
        `shown. Try <b>mode=assessment</b>.`;
    }
    if (mode !== 'history') return base;
    /* Only datasets carrying per-parcel value_history can drive this view; say so rather than
       leaving the reader with a silently all-grey map. */
    if (historyYear === null) {
      return `${base}<br>This dataset carries no <code>value_history</code>, so year-over-year change ` +
        `cannot be computed. Try <b>mode=assessment</b>.`;
    }
    const priced = (data.features || []).filter(f => historyChange(f.properties || {}, historyYear) !== null).length;
    return `${base}<br><b>${historyYear - 1} &rarr; ${historyYear}</b>: ${priced.toLocaleString()} parcels assessed in both years.`;
  }
  note.onAdd = function () {
    noteDiv = L.DomUtil.create('div', 'note');
    noteDiv.innerHTML = noteHtml();
    return noteDiv;
  };
  note.addTo(map);

  /* Year slider: only in history mode, and only when there are at least two comparable years. */
  if (mode === 'history' && historyYears.length > 1) {
    const slider = L.control({position: 'bottomleft'});
    slider.onAdd = function () {
      const div = L.DomUtil.create('div', 'note yearslider');
      const min = historyYears[0];
      const max = historyYears[historyYears.length - 1];
      div.innerHTML =
        `<label for="yearRange"><b>Year:</b> <span id="yearOut">${historyYear}</span></label><br>` +
        `<input id="yearRange" type="range" min="${min}" max="${max}" step="1" value="${historyYear}" ` +
        `list="yearTicks" style="width:220px"><br>` +
        `<span style="font-size:11px">${min}&ndash;${max}; colour is change from the prior year</span>`;
      /* Leaflet would otherwise treat drags and clicks on the control as map gestures. */
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    slider.addTo(map);

    const input = document.getElementById('yearRange');
    const out = document.getElementById('yearOut');
    if (input) {
      input.addEventListener('input', () => {
        const wanted = Number(input.value);
        /* Gap years (a year no parcel reports) snap to the nearest year we can actually draw. */
        const nearest = historyYears.reduce((a, b) => Math.abs(b - wanted) < Math.abs(a - wanted) ? b : a);
        if (nearest === historyYear) return;
        historyYear = nearest;
        if (out) out.textContent = String(historyYear);
        layer.setStyle(style);
        if (noteDiv) noteDiv.innerHTML = noteHtml();
      });
    }
  }
})().catch(error => {
  document.getElementById('map').textContent = `Map failed to load: ${error.message}`;
  console.error(error);
});
