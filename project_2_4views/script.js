import loadData from './editable_js/load_data.js';

// ── Helpers shared across views ──────────────────────────────────
function toTitleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function getStatus(result) {
  const r = (result || "").trim();
  const fail = ["Non-Compliant - Violations Observed","Critical Violations observed","------","Facility Closed"];
  const pass = ["Facility Reopened","Compliant - No Health Risk","Compliance Schedule - Completed","Compliance Schedule - Outstanding"];
  if (r.includes("Facility Closed")) return "closed";
  if (fail.some(p => r.includes(p))) return "fail";
  if (pass.some(p => r.includes(p))) return "pass";
  return "unknown";
}
function markerColor(result) {
  const r = (result || "").trim();
  if (r.includes("Facility Closed")) return "#7c3aed";
  if (r.includes("Critical")) return "#e63946";
  if (r.includes("Non-Compliant")) return "#f97316";
  if (["Compliant","Reopened","Completed","Outstanding"].some(p => r.includes(p))) return "#16a34a";
  return "#94a3b8";
}

// ── Display plumbing ─────────────────────────────────────────────
function setHTML(html) {
  document.getElementById("data-display").innerHTML = html;
}
function setActiveBtn(view) {
  document.querySelectorAll(".view-button").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(`btn-${view}`);
  if (btn) btn.classList.add("active");
}

// ════════════════════════════════════════════════════════════════
// VIEW 1 — TABLE
// ════════════════════════════════════════════════════════════════
function mountTable(data) {
  const rows = data.map(item => {
    const p = item.properties;
    const s = getStatus(p.inspection_results);
    const labels = { pass:"✓ Compliant", fail:"✗ Violations", closed:"⊘ Closed", unknown:"— Unknown" };
    return `<tr class="trow" data-status="${s}" data-name="${(p.name||"").toLowerCase()}" data-city="${(p.city||"").toLowerCase()}">
      <td class="td-name">${p.name || "—"}</td>
      <td>${toTitleCase(p.city)}</td>
      <td class="td-result">${p.inspection_results || "—"}</td>
      <td class="td-date">${p.inspection_date?.split("T")[0] || "—"}</td>
      <td><span class="badge badge-${s}">${labels[s]}</span></td>
    </tr>`;
  }).join("");

  setHTML(`
    <div class="tv-header">
      <div>
        <h2 class="view-title">Inspection Log</h2>
        <p class="view-description">${data.length} records · Prince George's County Health Dept</p>
      </div>
      <div class="tv-filters">
        <input type="text" id="tbl-search" class="tbl-search" placeholder="Search name or city…"/>
        <select id="tbl-filter" class="tbl-filter">
          <option value="all">All Statuses</option>
          <option value="pass">Compliant</option>
          <option value="fail">Violations</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
    <div class="table-scroll">
      <table class="data-table" id="main-table">
        <thead><tr>
          <th class="th-sort" data-col="0">Establishment <span class="sort-icon">⇅</span></th>
          <th class="th-sort" data-col="1">City <span class="sort-icon">⇅</span></th>
          <th class="th-sort" data-col="2">Result <span class="sort-icon">⇅</span></th>
          <th class="th-sort" data-col="3">Date <span class="sort-icon">⇅</span></th>
          <th class="th-sort" data-col="4">Status <span class="sort-icon">⇅</span></th>
        </tr></thead>
        <tbody id="tbl-body">${rows}</tbody>
      </table>
    </div>
  `);

  // Live filter
  function applyFilter() {
    const q = document.getElementById("tbl-search").value.toLowerCase();
    const f = document.getElementById("tbl-filter").value;
    document.querySelectorAll("#tbl-body .trow").forEach(tr => {
      const matchQ = !q || tr.dataset.name.includes(q) || tr.dataset.city.includes(q);
      const matchF = f === "all" || tr.dataset.status === f;
      tr.style.display = matchQ && matchF ? "" : "none";
    });
  }
  document.getElementById("tbl-search").addEventListener("input", applyFilter);
  document.getElementById("tbl-filter").addEventListener("change", applyFilter);

  // Sort
  let lastCol = -1, asc = true;
  document.querySelectorAll(".th-sort").forEach(th => {
    th.addEventListener("click", () => {
      const col = +th.dataset.col;
      asc = lastCol === col ? !asc : true;
      lastCol = col;
      document.querySelectorAll(".th-sort").forEach(t => t.classList.remove("sorted-asc","sorted-desc"));
      th.classList.add(asc ? "sorted-asc" : "sorted-desc");
      const tbody = document.getElementById("tbl-body");
      [...tbody.querySelectorAll(".trow")]
        .sort((a, b) => {
          const at = a.cells[col]?.textContent.trim() || "";
          const bt = b.cells[col]?.textContent.trim() || "";
          return asc ? at.localeCompare(bt) : bt.localeCompare(at);
        })
        .forEach(r => tbody.appendChild(r));
    });
  });
}

// ════════════════════════════════════════════════════════════════
// VIEW 2 — CATEGORY
// ════════════════════════════════════════════════════════════════
function mountCategories(data) {
  function buildGroups(groupKey) {
    const map = {};
    data.forEach(item => {
      const k = toTitleCase(item.properties[groupKey]) || "Unknown";
      if (!map[k]) map[k] = { pass:0, fail:0, unknown:0, closed:0, items:[] };
      map[k][getStatus(item.properties.inspection_results)]++;
      map[k].items.push(item);
    });
    return Object.entries(map).map(([label, g]) => ({
      label, total: g.items.length,
      pass: g.pass, fail: g.fail, unknown: g.unknown, closed: g.closed,
      passRate: Math.round(g.pass / g.items.length * 100),
      items: g.items.sort((a,b) => (a.properties.name||"").localeCompare(b.properties.name||""))
    })).sort((a,b) => b.total - a.total);
  }

  function groupsHTML(groupKey) {
    return buildGroups(groupKey).map((g, i) => `
      <div class="cat-block" style="animation-delay:${i*25}ms">
        <div class="cat-head">
          <div class="cat-head-left">
            <span class="cat-name">${g.label}</span>
            <span class="cat-count">${g.total} establishments</span>
          </div>
          <div class="cat-head-right">
            <div class="compliance-bar-wrap">
              <div class="compliance-bar-fill" style="width:${g.passRate}%"></div>
            </div>
            <span class="cat-rate ${g.passRate >= 50 ? 'rate-ok':'rate-bad'}">${g.passRate}%</span>
          </div>
        </div>
        <div class="cat-chips">
          <span class="chip chip-pass">✓ ${g.pass}</span>
          <span class="chip chip-fail">✗ ${g.fail}</span>
          ${g.closed ? `<span class="chip chip-closed">⊘ ${g.closed}</span>` : ""}
          ${g.unknown ? `<span class="chip chip-unk">? ${g.unknown}</span>` : ""}
        </div>
        <details class="cat-details">
          <summary>Show all ${g.total} →</summary>
          <ul class="cat-list">
            ${g.items.map(item => {
              const p = item.properties;
              const s = getStatus(p.inspection_results);
              return `<li class="cat-li cat-li-${s}">
                <span class="li-name">${p.name || "—"}</span>
                <span class="li-result">${p.inspection_results || "—"}</span>
              </li>`;
            }).join("")}
          </ul>
        </details>
      </div>
    `).join("");
  }

  setHTML(`
    <div class="tv-header">
      <div>
        <h2 class="view-title">Category View</h2>
        <p class="view-description">Explore compliance rates across different groupings</p>
      </div>
      <div class="tv-filters">
        <label class="filter-label">Group by:</label>
        <div class="pill-row">
          <button class="pill-btn pill-active" data-group="city">City</button>
          <button class="pill-btn" data-group="inspection_type">Inspection Type</button>
          <button class="pill-btn" data-group="category">Category</button>
        </div>
      </div>
    </div>
    <div id="cat-grid" class="cat-grid">${groupsHTML("city")}</div>
  `);

  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("pill-active"));
      btn.classList.add("pill-active");
      document.getElementById("cat-grid").innerHTML = groupsHTML(btn.dataset.group);
    });
  });
}

// ════════════════════════════════════════════════════════════════
// VIEW 3 — STATS
// ════════════════════════════════════════════════════════════════
function mountStats(data) {
  const total = data.length;
  const compliant = data.filter(d => getStatus(d.properties.inspection_results) === "pass").length;
  const critical = data.filter(d => (d.properties.inspection_results||"").includes("Critical")).length;
  const closed = data.filter(d => getStatus(d.properties.inspection_results) === "closed").length;
  const percentOk = ((compliant/total)*100).toFixed(1);

  const cityMap = {};
  data.forEach(d => {
    const city = toTitleCase(d.properties.city) || "Unknown";
    if (!cityMap[city]) cityMap[city] = { total:0, violations:0 };
    cityMap[city].total++;
    if (["fail","closed"].includes(getStatus(d.properties.inspection_results))) cityMap[city].violations++;
  });
  const cities = Object.entries(cityMap).sort((a,b) => b[1].total - a[1].total);
  const worstCity = [...cities].sort((a,b) => b[1].violations - a[1].violations)[0];
  const bestCity = [...cities]
    .filter(([,v]) => v.total >= 5)
    .map(([city,v]) => ({ city, rate: (v.total-v.violations)/v.total }))
    .sort((a,b) => b.rate - a.rate)[0];

  const dates = data.map(d => d.properties.inspection_date?.split("T")[0]).filter(Boolean).sort();

  const FIELDS = [
    { key:"rodent_and_insects",           label:"Rodent & Insects" },
    { key:"food_contact_surfaces_and",    label:"Food Contact Surfaces" },
    { key:"cooling_time_and_temperature", label:"Cooling Time/Temp" },
    { key:"cold_holding_temperature",     label:"Cold Temp Control" },
    { key:"hot_holding_temperature",      label:"Hot Temp Control" },
    { key:"cooking_time_and_temperature", label:"Cooking Time/Temp" },
    { key:"proper_hand_washing",          label:"Hand Washing" },
    { key:"no_bare_hand_contact",         label:"No Bare Hand Contact" },
    { key:"food_from_approved_source",    label:"Approved Food Source" },
    { key:"ill_workers_restricted",       label:"Ill Workers Restricted" },
  ];
  const fieldRates = FIELDS.map(f => {
    const valid = data.filter(d => d.properties[f.key] && d.properties[f.key] !== "N/A");
    const out = valid.filter(d => d.properties[f.key] === "Out of Compliance").length;
    return { ...f, rate: valid.length ? Math.round(out/valid.length*100) : 0 };
  }).sort((a,b) => b.rate - a.rate);

  const typeMap = {};
  data.forEach(d => { const t = d.properties.inspection_type||"N/A"; typeMap[t]=(typeMap[t]||0)+1; });
  const typeEntries = Object.entries(typeMap).sort((a,b)=>b[1]-a[1]);

  setHTML(`
    <div class="tv-header">
      <div>
        <h2 class="view-title">Health Inspection Dashboard</h2>
        <p class="view-description">Prince George's County, MD · ${dates[0]} – ${dates[dates.length-1]}</p>
      </div>
    </div>

    <div class="stats-hero">
      <div class="stat-card sc-total"><div class="sc-val">${total}</div><div class="sc-label">Total Inspections</div></div>
      <div class="stat-card sc-pass"><div class="sc-val">${percentOk}%</div><div class="sc-label">Compliance Rate</div><div class="sc-sub">${compliant} compliant</div></div>
      <div class="stat-card sc-crit"><div class="sc-val">${critical}</div><div class="sc-label">Critical Violations</div><div class="sc-sub">${((critical/total)*100).toFixed(1)}% of all records</div></div>
      <div class="stat-card sc-closed"><div class="sc-val">${closed}</div><div class="sc-label">Facilities Closed</div></div>
      <div class="stat-card sc-cities"><div class="sc-val">${cities.length}</div><div class="sc-label">Cities Covered</div></div>
    </div>

    <div class="stats-row">
      <div class="stats-block">
        <h3 class="sb-title">Highest Violation City</h3>
        <div class="city-highlight city-bad">
          <div class="ch-name">${worstCity?.[0]||"—"}</div>
          <div class="ch-detail">${worstCity?.[1].violations||0} violations / ${worstCity?.[1].total||0} inspections</div>
        </div>
      </div>
      <div class="stats-block">
        <h3 class="sb-title">Best Compliance City <span class="sb-note">(min 5 records)</span></h3>
        <div class="city-highlight city-good">
          <div class="ch-name">${bestCity?.city||"—"}</div>
          <div class="ch-detail">${bestCity ? (bestCity.rate*100).toFixed(1)+"% compliance" : ""}</div>
        </div>
      </div>
      <div class="stats-block">
        <h3 class="sb-title">By Inspection Type</h3>
        ${typeEntries.map(([t,n]) => `
          <div class="type-row">
            <span class="type-label">${t}</span>
            <div class="type-bar-wrap"><div class="type-bar-fill" style="width:${Math.round(n/total*100)}%"></div></div>
            <span class="type-count">${n}</span>
          </div>`).join("")}
      </div>
    </div>

    <div class="stats-block stats-block-full">
      <h3 class="sb-title">Violation Rate by Category</h3>
      <p class="sb-sub">% of inspections where each category was Out of Compliance</p>
      <div class="field-chart">
        ${fieldRates.map(f => `
          <div class="fc-row">
            <span class="fc-label">${f.label}</span>
            <div class="fc-track"><div class="fc-fill ${f.rate>20?'fc-danger':f.rate>10?'fc-warn':'fc-ok'}" style="width:${f.rate}%"></div></div>
            <span class="fc-pct">${f.rate}%</span>
          </div>`).join("")}
      </div>
    </div>

    <div class="stats-block stats-block-full">
      <h3 class="sb-title">All Cities at a Glance</h3>
      <div class="city-table-wrap">
        <table class="city-table">
          <thead><tr><th>City</th><th>Inspections</th><th>Violations</th><th>Compliance Rate</th></tr></thead>
          <tbody>
            ${cities.map(([city,v]) => {
              const rate = Math.round((v.total-v.violations)/v.total*100);
              return `<tr>
                <td>${city}</td><td>${v.total}</td><td>${v.violations}</td>
                <td style="display:flex;align-items:center;gap:8px">
                  <div class="mini-bar-wrap"><div class="mini-bar-fill ${rate>=50?'mini-ok':'mini-bad'}" style="width:${rate}%"></div></div>
                  <span>${rate}%</span>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `);
}

// ════════════════════════════════════════════════════════════════
// VIEW 4 — EXTERNAL (Leaflet + Chart.js)
// ════════════════════════════════════════════════════════════════

// Load external scripts once, resolve when ready
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function loadLink(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}

async function mountExternal(data) {
  // Show placeholder while libraries load
  setHTML(`
    <div class="tv-header">
      <div>
        <h2 class="view-title">Map &amp; Chart Explorer</h2>
        <p class="view-description">Leaflet.js map + Chart.js donut · color-coded by compliance status</p>
      </div>
      <div class="tv-filters">
        <label class="filter-label">City:</label>
        <select id="cityFilter" class="tbl-filter">
          <option value="All">All Cities</option>
          ${[...new Set(data.map(d => toTitleCase(d.properties.city)))].sort().map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <label class="filter-label">Status:</label>
        <select id="statusFilter" class="tbl-filter">
          <option value="all">All Statuses</option>
          <option value="pass">Compliant</option>
          <option value="fail">Violations</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
    <div class="ext-layout">
      <div id="map" style="flex:1;min-height:480px;border-radius:10px;border:1px solid var(--border)"></div>
      <div class="ext-sidebar">
        <div class="sidebar-card">
          <h3 class="sb-title">Compliance Breakdown</h3>
          <p id="donut-label" class="donut-label">Loading…</p>
          <canvas id="donut-chart" width="200" height="200"></canvas>
        </div>
        <div class="sidebar-card">
          <h3 class="sb-title">Legend</h3>
          <div class="legend-list">
            <div class="legend-item"><span class="legend-dot" style="background:#16a34a"></span>Compliant</div>
            <div class="legend-item"><span class="legend-dot" style="background:#f97316"></span>Non-Compliant</div>
            <div class="legend-item"><span class="legend-dot" style="background:#e63946"></span>Critical Violations</div>
            <div class="legend-item"><span class="legend-dot" style="background:#7c3aed"></span>Facility Closed</div>
            <div class="legend-item"><span class="legend-dot" style="background:#94a3b8"></span>Unknown / Pending</div>
          </div>
        </div>
        <div class="sidebar-card" id="hover-card" style="display:none">
          <h3 class="sb-title">Selected</h3>
          <div id="hover-content"></div>
        </div>
      </div>
    </div>
  `);

  // Load libraries
  loadLink("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
  await Promise.all([
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"),
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"),
  ]);

  // Init map
  const map = L.map("map").setView([38.9, -76.85], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  let markers = [];
  let donutChart = null;

  function buildDonut(filtered) {
    const pass   = filtered.filter(d => getStatus(d.properties.inspection_results) === "pass").length;
    const fail   = filtered.filter(d => getStatus(d.properties.inspection_results) === "fail").length;
    const closed = filtered.filter(d => getStatus(d.properties.inspection_results) === "closed").length;
    const unk    = filtered.filter(d => getStatus(d.properties.inspection_results) === "unknown").length;
    document.getElementById("donut-label").textContent = `${filtered.length} records shown`;
    const ctx = document.getElementById("donut-chart").getContext("2d");
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Compliant","Violations","Closed","Unknown"],
        datasets: [{ data:[pass,fail,closed,unk], backgroundColor:["#16a34a","#f97316","#7c3aed","#94a3b8"], borderWidth:0, hoverOffset:8 }]
      },
      options: { responsive:false, cutout:"68%", plugins:{ legend:{ display:false } } }
    });
  }

  function renderMarkers(filtered) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    filtered.forEach(item => {
      const coords = item.geometry?.coordinates;
      const p = item.properties;
      if (!coords) return;
      const color = markerColor(p.inspection_results);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:11px;height:11px;background:${color};border-radius:50%;border:2px solid rgba(0,0,0,0.25);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize:[11,11], iconAnchor:[5,5]
      });
      const m = L.marker([coords[1],coords[0]], {icon}).addTo(map);
      m.bindPopup(`<strong>${p.name||"—"}</strong><br>${toTitleCase(p.city)}<br>${p.address_line_1||""}<br><em>${p.inspection_results||"—"}</em><br><small>${p.inspection_date?.split("T")[0]||"—"}</small>`);
      m.on("click", () => {
        const card = document.getElementById("hover-card");
        const content = document.getElementById("hover-content");
        if (!card || !content) return;
        card.style.display = "";
        content.innerHTML = `
          <p class="hc-name">${p.name||"—"}</p>
          <p class="hc-detail">${toTitleCase(p.city)} · ${p.address_line_1||""}</p>
          <p class="hc-result">${p.inspection_results||"—"}</p>
          <p class="hc-date">${p.inspection_date?.split("T")[0]||"—"}</p>
          <p class="hc-owner">Owner: ${p.owner||"—"}</p>`;
      });
      markers.push(m);
    });
    buildDonut(filtered);
  }

  function applyFilters() {
    const city   = document.getElementById("cityFilter")?.value || "All";
    const status = document.getElementById("statusFilter")?.value || "all";
    const filtered = data.filter(d => {
      const matchCity   = city === "All" || toTitleCase(d.properties.city) === city;
      const matchStatus = status === "all" || getStatus(d.properties.inspection_results) === status;
      return matchCity && matchStatus;
    });
    renderMarkers(filtered);
  }

  document.getElementById("cityFilter").addEventListener("change", applyFilters);
  document.getElementById("statusFilter").addEventListener("change", applyFilters);
  renderMarkers(data);
}

// ════════════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  setHTML('<div class="loading">Loading inspection data…</div>');
  try {
    const data = await loadData();
    console.log(`Loaded ${data.length} items`);

    document.getElementById("btn-external").onclick   = () => { mountExternal(data);    setActiveBtn("external"); };
    document.getElementById("btn-table").onclick      = () => { mountTable(data);        setActiveBtn("table"); };
    document.getElementById("btn-categories").onclick = () => { mountCategories(data);   setActiveBtn("categories"); };
    document.getElementById("btn-stats").onclick      = () => { mountStats(data);        setActiveBtn("stats"); };

    // Default view
    mountTable(data);
    setActiveBtn("table");
  } catch (err) {
    console.error(err);
    setHTML(`<div class="error"><h3>Error Loading Data</h3><p>${err.message}</p></div>`);
  }
});
