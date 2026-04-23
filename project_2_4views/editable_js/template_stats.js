/**
 * STATS VIEW — Dashboard with 5+ meaningful statistics
 */

function toTitleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function showStats(data) {
  if (!data || data.length === 0) return `<div class="stat-card">No Data Available</div>`;

  const COMPLIANCE_FIELDS = [
    { key: "food_from_approved_source",     label: "Approved Food Source" },
    { key: "proper_hand_washing",           label: "Hand Washing" },
    { key: "rodent_and_insects",            label: "Rodent & Insects" },
    { key: "cold_holding_temperature",      label: "Cold Temp Control" },
    { key: "hot_holding_temperature",       label: "Hot Temp Control" },
    { key: "cooling_time_and_temperature",  label: "Cooling Time/Temp" },
    { key: "cooking_time_and_temperature",  label: "Cooking Time/Temp" },
    { key: "no_bare_hand_contact",          label: "No Bare Hand Contact" },
    { key: "food_contact_surfaces_and",     label: "Food Contact Surfaces" },
    { key: "ill_workers_restricted",        label: "Ill Workers Restricted" },
  ];

  const total = data.length;

  // Overall compliance
  const PASS = ["Facility Reopened","Compliant - No Health Risk","Compliance Schedule - Completed","Compliance Schedule - Outstanding"];
  const FAIL = ["Non-Compliant - Violations Observed","Critical Violations observed","------","Facility Closed"];
  const compliant = data.filter(d => PASS.some(p => (d.properties.inspection_results||"").includes(p))).length;
  const critical = data.filter(d => (d.properties.inspection_results||"").includes("Critical")).length;
  const closed = data.filter(d => (d.properties.inspection_results||"").includes("Facility Closed")).length;
  const percentOk = ((compliant / total) * 100).toFixed(1);

  // City with most violations
  const cityMap = {};
  data.forEach(d => {
    const city = toTitleCase(d.properties.city) || "Unknown";
    if (!cityMap[city]) cityMap[city] = { total: 0, violations: 0 };
    cityMap[city].total++;
    if (FAIL.some(p => (d.properties.inspection_results||"").includes(p))) cityMap[city].violations++;
  });
  const cities = Object.entries(cityMap).sort((a,b) => b[1].total - a[1].total);
  const worstCity = [...cities].sort((a,b) => b[1].violations - a[1].violations)[0];
  const bestCity = [...cities]
    .filter(([,v]) => v.total >= 5)
    .map(([city,v]) => ({ city, rate: v.total ? (v.total - v.violations) / v.total : 0 }))
    .sort((a,b) => b.rate - a.rate)[0];

  // Date range
  const dates = data.map(d => d.properties.inspection_date?.split("T")[0]).filter(Boolean).sort();
  const earliest = dates[0] || "—";
  const latest = dates[dates.length - 1] || "—";

  // Per-field compliance rates
  const fieldRates = COMPLIANCE_FIELDS.map(f => {
    const withField = data.filter(d => d.properties[f.key] && d.properties[f.key] !== "N/A");
    const out = withField.filter(d => d.properties[f.key] === "Out of Compliance").length;
    const rate = withField.length ? Math.round((out / withField.length) * 100) : 0;
    return { ...f, outRate: rate, n: withField.length };
  }).sort((a, b) => b.outRate - a.outRate);

  // Inspection type breakdown
  const typeMap = {};
  data.forEach(d => {
    const t = d.properties.inspection_type || "N/A";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeEntries = Object.entries(typeMap).sort((a,b) => b[1]-a[1]);

  return `
    <div class="stats-view">
      <div class="tv-header">
        <div>
          <h2 class="view-title">Health Inspection Dashboard</h2>
          <p class="view-description">Prince George's County, MD · ${earliest} – ${latest}</p>
        </div>
      </div>

      <!-- Hero stat cards -->
      <div class="stats-hero">
        <div class="stat-card sc-total">
          <div class="sc-val">${total}</div>
          <div class="sc-label">Total Inspections</div>
        </div>
        <div class="stat-card sc-pass">
          <div class="sc-val">${percentOk}%</div>
          <div class="sc-label">Overall Compliance Rate</div>
          <div class="sc-sub">${compliant} compliant establishments</div>
        </div>
        <div class="stat-card sc-crit">
          <div class="sc-val">${critical}</div>
          <div class="sc-label">Critical Violations</div>
          <div class="sc-sub">${((critical/total)*100).toFixed(1)}% of all records</div>
        </div>
        <div class="stat-card sc-closed">
          <div class="sc-val">${closed}</div>
          <div class="sc-label">Facilities Closed</div>
        </div>
        <div class="stat-card sc-cities">
          <div class="sc-val">${cities.length}</div>
          <div class="sc-label">Cities Covered</div>
        </div>
      </div>

      <!-- City highlights -->
      <div class="stats-row">
        <div class="stats-block">
          <h3 class="sb-title">Highest Violation City</h3>
          <div class="city-highlight city-bad">
            <div class="ch-name">${worstCity?.[0] || "—"}</div>
            <div class="ch-detail">${worstCity?.[1].violations || 0} violations out of ${worstCity?.[1].total || 0} inspections</div>
          </div>
        </div>
        <div class="stats-block">
          <h3 class="sb-title">Best Compliance City <span class="sb-note">(min. 5 records)</span></h3>
          <div class="city-highlight city-good">
            <div class="ch-name">${bestCity?.city || "—"}</div>
            <div class="ch-detail">${bestCity ? (bestCity.rate * 100).toFixed(1) + "% compliance rate" : ""}</div>
          </div>
        </div>

        <!-- Inspection type breakdown -->
        <div class="stats-block">
          <h3 class="sb-title">By Inspection Type</h3>
          ${typeEntries.map(([t,n]) => `
            <div class="type-row">
              <span class="type-label">${t}</span>
              <div class="type-bar-wrap">
                <div class="type-bar-fill" style="width:${Math.round(n/total*100)}%"></div>
              </div>
              <span class="type-count">${n}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Per-field violation rates -->
      <div class="stats-block stats-block-full">
        <h3 class="sb-title">Violation Rate by Compliance Category</h3>
        <p class="sb-sub">% of inspections where each category was <em>Out of Compliance</em></p>
        <div class="field-chart">
          ${fieldRates.map(f => `
            <div class="fc-row">
              <span class="fc-label">${f.label}</span>
              <div class="fc-track">
                <div class="fc-fill ${f.outRate > 20 ? 'fc-danger' : f.outRate > 10 ? 'fc-warn' : 'fc-ok'}"
                     style="width:${f.outRate}%; min-width: ${f.outRate > 0 ? '2px' : '0'}"></div>
              </div>
              <span class="fc-pct">${f.outRate}%</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- City-by-city table -->
      <div class="stats-block stats-block-full">
        <h3 class="sb-title">All Cities at a Glance</h3>
        <div class="city-table-wrap">
          <table class="city-table">
            <thead><tr><th>City</th><th>Inspections</th><th>Violations</th><th>Compliance Rate</th></tr></thead>
            <tbody>
              ${cities.map(([city, v]) => {
                const rate = Math.round((v.total - v.violations) / v.total * 100);
                return `
                  <tr>
                    <td>${city}</td>
                    <td>${v.total}</td>
                    <td>${v.violations}</td>
                    <td>
                      <div class="mini-bar-wrap">
                        <div class="mini-bar-fill ${rate >= 50 ? 'mini-ok' : 'mini-bad'}" style="width:${rate}%"></div>
                      </div>
                      <span>${rate}%</span>
                    </td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export default showStats;
