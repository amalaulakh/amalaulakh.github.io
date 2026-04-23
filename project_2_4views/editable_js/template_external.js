/**
 * EXTERNAL LIBRARY VIEW
 * Library 1: Leaflet.js — interactive map with color-coded markers
 * Library 2: Chart.js   — live donut chart updating with map filter
 */

function toTitleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getStatus(result) {
  const r = (result || "").trim();
  if (["Non-Compliant - Violations Observed","Critical Violations observed","------","Facility Closed"].some(p => r.includes(p))) return "fail";
  if (["Facility Reopened","Compliant - No Health Risk","Compliance Schedule - Completed","Compliance Schedule - Outstanding"].some(p => r.includes(p))) return "pass";
  return "unknown";
}

function showExternal(data) {
  // expose data globally so the inline script can access it
  window.__pgcData = data;

  const cities = ["All", ...[...new Set(data.map(d => toTitleCase(d.properties.city)))].sort()];

  return `
    <div class="ext-view">
      <div class="tv-header">
        <div>
          <h2 class="view-title">Map & Chart Explorer</h2>
          <p class="view-description">Leaflet.js map + Chart.js donut · color-coded by compliance status</p>
        </div>
        <div class="tv-filters">
          <label class="filter-label">Filter city:</label>
          <select id="cityFilter" class="tbl-filter">
            ${cities.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
          <label class="filter-label">Status:</label>
          <select id="statusFilter" class="tbl-filter">
            <option value="all">All Statuses</option>
            <option value="pass">Compliant</option>
            <option value="fail">Violations</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div class="ext-layout">
        <div id="map" style="flex:1; min-height:500px; border-radius:10px; z-index:1;"></div>
        <div class="ext-sidebar">
          <div class="sidebar-card">
            <h3 class="sb-title">Compliance Breakdown</h3>
            <p id="donut-label" class="donut-label">All ${data.length} records</p>
            <canvas id="donut-chart" width="220" height="220"></canvas>
          </div>
          <div class="sidebar-card">
            <h3 class="sb-title">Legend</h3>
            <div class="legend-list">
              <div class="legend-item"><span class="legend-dot dot-pass"></span> Compliant</div>
              <div class="legend-item"><span class="legend-dot dot-fail"></span> Violations</div>
              <div class="legend-item"><span class="legend-dot dot-crit"></span> Critical Violations</div>
              <div class="legend-item"><span class="legend-dot dot-closed"></span> Facility Closed</div>
              <div class="legend-item"><span class="legend-dot dot-unk"></span> Unknown / Pending</div>
            </div>
          </div>
          <div class="sidebar-card" id="hover-card" style="display:none">
            <h3 class="sb-title">Selected</h3>
            <div id="hover-content"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaflet CSS + JS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
    <!-- Chart.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>

    <script>
    (function() {
      const data = window.__pgcData;

      // ── Marker color by result ──────────────────────────────
      function markerColor(result) {
        const r = (result || "").trim();
        if (r.includes("Critical")) return "#e63946";
        if (r.includes("Facility Closed")) return "#6d28d9";
        if (r.includes("Non-Compliant")) return "#f97316";
        if (r.includes("Compliant") || r.includes("Reopened") || r.includes("Completed") || r.includes("Outstanding")) return "#16a34a";
        return "#94a3b8";
      }

      function getStatus(r){
        const rs=(r||"").trim();
        if(["Non-Compliant - Violations Observed","Critical Violations observed","------","Facility Closed"].some(p=>rs.includes(p)))return"fail";
        if(["Facility Reopened","Compliant - No Health Risk","Compliance Schedule - Completed","Compliance Schedule - Outstanding"].some(p=>rs.includes(p)))return"pass";
        return"unknown";
      }

      function toTitleCase(str){return(str||"").toLowerCase().replace(/\\b\\w/g,c=>c.toUpperCase());}

      // ── Map init ────────────────────────────────────────────
      const map = L.map("map").setView([38.9, -76.85], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(map);

      let markers = [];
      let donutChart = null;

      // ── Donut chart ─────────────────────────────────────────
      function buildDonut(filtered) {
        const pass = filtered.filter(d => getStatus(d.properties.inspection_results) === "pass").length;
        const fail = filtered.filter(d => getStatus(d.properties.inspection_results) === "fail").length;
        const unk  = filtered.filter(d => getStatus(d.properties.inspection_results) === "unknown").length;

        const ctx = document.getElementById("donut-chart").getContext("2d");
        if (donutChart) donutChart.destroy();
        donutChart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Compliant", "Violations", "Unknown"],
            datasets: [{
              data: [pass, fail, unk],
              backgroundColor: ["#16a34a","#e63946","#94a3b8"],
              borderWidth: 0,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: false,
            cutout: "68%",
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
        document.getElementById("donut-label").textContent = \`\${filtered.length} records shown\`;
      }

      // ── Render markers ──────────────────────────────────────
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
            html: \`<div style="width:12px;height:12px;background:\${color};border-radius:50%;border:2px solid rgba(0,0,0,0.3);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>\`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const marker = L.marker([coords[1], coords[0]], { icon })
            .addTo(map)
            .bindPopup(\`
              <strong>\${p.name || "—"}</strong><br>
              \${toTitleCase(p.city)}<br>
              \${p.address_line_1 || ""}<br>
              <em>\${p.inspection_results || "—"}</em><br>
              <small>\${p.inspection_date?.split("T")[0] || "—"}</small>
            \`);

          marker.on("click", () => {
            const card = document.getElementById("hover-card");
            const content = document.getElementById("hover-content");
            card.style.display = "";
            content.innerHTML = \`
              <p class="hc-name">\${p.name || "—"}</p>
              <p class="hc-detail">\${toTitleCase(p.city)} · \${p.address_line_1 || ""}</p>
              <p class="hc-result">\${p.inspection_results || "—"}</p>
              <p class="hc-date">\${p.inspection_date?.split("T")[0] || "—"}</p>
              <p class="hc-owner">Owner: \${p.owner || "—"}</p>
            \`;
          });

          markers.push(marker);
        });

        buildDonut(filtered);
      }

      // ── Filter logic ────────────────────────────────────────
      function applyFilters() {
        const city = document.getElementById("cityFilter").value;
        const status = document.getElementById("statusFilter").value;

        const filtered = data.filter(d => {
          const matchCity = city === "All" || toTitleCase(d.properties.city) === city;
          const matchStatus = status === "all" || getStatus(d.properties.inspection_results) === status;
          return matchCity && matchStatus;
        });

        renderMarkers(filtered);
      }

      document.getElementById("cityFilter").addEventListener("change", applyFilters);
      document.getElementById("statusFilter").addEventListener("change", applyFilters);

      renderMarkers(data);
    })();
    <\/script>
  `;
}

export default showExternal;
