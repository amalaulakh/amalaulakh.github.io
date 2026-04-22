/**
 * CATEGORY VIEW — Group by city, show compliance breakdown per group
 */

function toTitleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getStatus(result) {
  const r = (result || "").trim();
  const fail = ["Non-Compliant - Violations Observed", "Critical Violations observed", "------", "Facility Closed"];
  const pass = ["Facility Reopened", "Compliant - No Health Risk", "Compliance Schedule - Completed", "Compliance Schedule - Outstanding"];
  if (fail.some(p => r.includes(p))) return "fail";
  if (pass.some(p => r.includes(p))) return "pass";
  return "unknown";
}

function showCategories(data) {
  // Build group-by options
  const GROUPS = [
    { key: "city",            label: "City" },
    { key: "inspection_type", label: "Inspection Type" },
    { key: "category",        label: "Category" },
  ];

  function buildGroups(groupKey) {
    const map = {};
    data.forEach(item => {
      const k = toTitleCase(item.properties[groupKey]) || "Unknown";
      if (!map[k]) map[k] = { pass: 0, fail: 0, unknown: 0, items: [] };
      const s = getStatus(item.properties.inspection_results);
      map[k][s]++;
      map[k].items.push(item);
    });
    return Object.entries(map)
      .map(([label, g]) => ({
        label,
        total: g.items.length,
        pass: g.pass, fail: g.fail, unknown: g.unknown,
        passRate: g.items.length ? Math.round(g.pass / g.items.length * 100) : 0,
        items: g.items.sort((a, b) => (a.properties.name || "").localeCompare(b.properties.name || ""))
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Initial render with city grouping
  function renderGroups(groupKey) {
    const groups = buildGroups(groupKey);
    return groups.map((g, i) => `
      <div class="cat-block" style="animation-delay:${i * 30}ms">
        <div class="cat-head">
          <div class="cat-head-left">
            <span class="cat-name">${g.label}</span>
            <span class="cat-count">${g.total} establishments</span>
          </div>
          <div class="cat-head-right">
            <div class="compliance-bar-wrap" title="${g.passRate}% compliant">
              <div class="compliance-bar-fill" style="width:${g.passRate}%"></div>
            </div>
            <span class="cat-rate ${g.passRate >= 50 ? 'rate-ok' : 'rate-bad'}">${g.passRate}%</span>
          </div>
        </div>
        <div class="cat-chips">
          <span class="chip chip-pass">✓ ${g.pass} compliant</span>
          <span class="chip chip-fail">✗ ${g.fail} violations</span>
          ${g.unknown ? `<span class="chip chip-unk">? ${g.unknown} unknown</span>` : ""}
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

  return `
    <div class="cat-view">
      <div class="tv-header">
        <div>
          <h2 class="view-title">Category View</h2>
          <p class="view-description">Explore compliance rates across different groupings</p>
        </div>
        <div class="tv-filters">
          <label class="filter-label">Group by:</label>
          <div class="pill-row" id="group-pills">
            ${GROUPS.map((g, i) => `
              <button class="pill-btn ${i === 0 ? 'pill-active' : ''}" data-group="${g.key}">${g.label}</button>
            `).join("")}
          </div>
        </div>
      </div>

      <div id="cat-grid" class="cat-grid">
        ${renderGroups("city")}
      </div>
    </div>

    <script>
    (function() {
      document.querySelectorAll('#group-pills .pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#group-pills .pill-btn').forEach(b => b.classList.remove('pill-active'));
          btn.classList.add('pill-active');

          const key = btn.dataset.group;
          // re-render groups inline
          const data = window.__pgcData;
          if (!data) return;

          function toTitleCase(str) { return (str||"").toLowerCase().replace(/\\b\\w/g,c=>c.toUpperCase()); }
          function getStatus(r){ const f=["Non-Compliant - Violations Observed","Critical Violations observed","------","Facility Closed"],p=["Facility Reopened","Compliant - No Health Risk","Compliance Schedule - Completed","Compliance Schedule - Outstanding"],tr=(r||"").trim();if(f.some(x=>tr.includes(x)))return"fail";if(p.some(x=>tr.includes(x)))return"pass";return"unknown";}

          const map = {};
          data.forEach(item => {
            const k = toTitleCase(item.properties[key]) || "Unknown";
            if (!map[k]) map[k] = { pass:0, fail:0, unknown:0, items:[] };
            const s = getStatus(item.properties.inspection_results);
            map[k][s]++; map[k].items.push(item);
          });
          const groups = Object.entries(map).map(([label,g])=>({
            label, total:g.items.length, pass:g.pass, fail:g.fail, unknown:g.unknown,
            passRate:g.items.length?Math.round(g.pass/g.items.length*100):0,
            items:g.items.sort((a,b)=>(a.properties.name||"").localeCompare(b.properties.name||""))
          })).sort((a,b)=>b.total-a.total);

          document.getElementById('cat-grid').innerHTML = groups.map((g,i)=>`
            <div class="cat-block" style="animation-delay:${i*30}ms">
              <div class="cat-head">
                <div class="cat-head-left"><span class="cat-name">${g.label}</span><span class="cat-count">${g.total} establishments</span></div>
                <div class="cat-head-right">
                  <div class="compliance-bar-wrap" title="${g.passRate}%"><div class="compliance-bar-fill" style="width:${g.passRate}%"></div></div>
                  <span class="cat-rate ${g.passRate>=50?'rate-ok':'rate-bad'}">${g.passRate}%</span>
                </div>
              </div>
              <div class="cat-chips">
                <span class="chip chip-pass">✓ ${g.pass} compliant</span>
                <span class="chip chip-fail">✗ ${g.fail} violations</span>
                ${g.unknown?`<span class="chip chip-unk">? ${g.unknown} unknown</span>`:""}
              </div>
              <details class="cat-details"><summary>Show all ${g.total} →</summary>
                <ul class="cat-list">${g.items.map(item=>{const p=item.properties,s=getStatus(p.inspection_results);return\`<li class="cat-li cat-li-\${s}"><span class="li-name">\${p.name||"—"}</span><span class="li-result">\${p.inspection_results||"—"}</span></li>\`;}).join("")}</ul>
              </details>
            </div>
          `).join("");
        });
      });
    })();
    <\/script>
  `;
}

export default showCategories;
