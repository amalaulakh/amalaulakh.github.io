/**
 * TABLE VIEW — Sortable inspection log
 */

const COMPLIANT_PHRASES = [
  "Facility Reopened",
  "Compliant - No Health Risk",
  "Compliance Schedule - Completed",
  "Compliance Schedule - Outstanding"
];
const NON_COMPLIANT_PHRASES = [
  "Non-Compliant - Violations Observed",
  "Critical Violations observed",
  "------",
  "Facility Closed"
];

function getStatus(result) {
  const r = (result || "").trim();
  if (NON_COMPLIANT_PHRASES.some(p => r.includes(p))) return "fail";
  if (r === "Facility Closed") return "closed";
  if (COMPLIANT_PHRASES.some(p => r.includes(p))) return "pass";
  return "unknown";
}

function toTitleCase(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function showTable(data) {
  const rows = data.map(item => {
    const p = item.properties;
    const status = getStatus(p.inspection_results);
    const date = p.inspection_date?.split("T")[0] || "—";
    const city = toTitleCase(p.city);

    const statusLabel = {
      pass: "✓ Compliant",
      fail: "✗ Violations",
      closed: "⊘ Closed",
      unknown: "— Unknown"
    }[status];

    return `
      <tr class="trow" data-status="${status}">
        <td class="td-name">${p.name || "—"}</td>
        <td>${city}</td>
        <td class="td-result">${p.inspection_results || "—"}</td>
        <td class="td-date">${date}</td>
        <td><span class="badge badge-${status}">${statusLabel}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <div class="table-view">
      <div class="tv-header">
        <div>
          <h2 class="view-title">Inspection Log</h2>
          <p class="view-description">${data.length} records from Prince George's County Health Department</p>
        </div>
        <div class="tv-filters">
          <input type="text" id="tbl-search" class="tbl-search" placeholder="Search name or city…" />
          <select id="tbl-filter" class="tbl-filter">
            <option value="all">All Statuses</option>
            <option value="pass">Compliant</option>
            <option value="fail">Violations</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table sortable-table" id="main-table">
          <thead>
            <tr>
              <th class="th-sort" data-col="0">Establishment <span class="sort-icon">⇅</span></th>
              <th class="th-sort" data-col="1">City <span class="sort-icon">⇅</span></th>
              <th class="th-sort" data-col="2">Result <span class="sort-icon">⇅</span></th>
              <th class="th-sort" data-col="3">Date <span class="sort-icon">⇅</span></th>
              <th class="th-sort" data-col="4">Status <span class="sort-icon">⇅</span></th>
            </tr>
          </thead>
          <tbody id="tbl-body">
            ${rows}
          </tbody>
        </table>
      </div>
    </div>

    <script>
    (function() {
      // Live search + filter
      function applyFilters() {
        const q = document.getElementById('tbl-search').value.toLowerCase();
        const f = document.getElementById('tbl-filter').value;
        document.querySelectorAll('#tbl-body .trow').forEach(tr => {
          const text = tr.textContent.toLowerCase();
          const status = tr.dataset.status;
          const matchQ = !q || text.includes(q);
          const matchF = f === 'all' || status === f;
          tr.style.display = matchQ && matchF ? '' : 'none';
        });
      }

      document.getElementById('tbl-search').addEventListener('input', applyFilters);
      document.getElementById('tbl-filter').addEventListener('change', applyFilters);

      // Sortable columns
      let lastCol = -1, asc = true;
      document.querySelectorAll('.th-sort').forEach(th => {
        th.addEventListener('click', () => {
          const col = parseInt(th.dataset.col);
          asc = lastCol === col ? !asc : true;
          lastCol = col;
          document.querySelectorAll('.th-sort').forEach(t => t.classList.remove('sorted-asc','sorted-desc'));
          th.classList.add(asc ? 'sorted-asc' : 'sorted-desc');

          const tbody = document.getElementById('tbl-body');
          const rows = Array.from(tbody.querySelectorAll('.trow'));
          rows.sort((a, b) => {
            const at = a.cells[col]?.textContent.trim() || '';
            const bt = b.cells[col]?.textContent.trim() || '';
            return asc ? at.localeCompare(bt) : bt.localeCompare(at);
          });
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    })();
    <\/script>
  `;
}

export default showTable;
