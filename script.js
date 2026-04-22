import showCategories from './editable_js/template_category.js';
import showStats from './editable_js/template_stats.js';
import showTable from './editable_js/template_table.js';
import showExternal from './editable_js/template_external.js';
import loadData from './editable_js/load_data.js';

function updateDisplay(content) {
  document.getElementById("data-display").innerHTML = content;
}

function updateButtonStates(activeView) {
  document.querySelectorAll(".view-button").forEach((button) => {
    button.classList.remove("active");
  });
  const btn = document.getElementById(`btn-${activeView}`);
  if (btn) btn.classList.add("active");
}

function showLoading() {
  updateDisplay('<div class="loading">Loading data…</div>');
}

function showError(message) {
  updateDisplay(`
    <div class="error">
      <h3>Error Loading Data</h3>
      <p>${message}</p>
      <button onclick="location.reload()">Try Again</button>
    </div>
  `);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Starting application...");
  try {
    showLoading();
    const data = await loadData();
    console.log(`Loaded ${data.length} items`);
    window.__pgcData = data;

    document.getElementById("btn-external").onclick = () => {
      updateDisplay(showExternal(data));
      updateButtonStates("external");
    };
    document.getElementById("btn-table").onclick = () => {
      updateDisplay(showTable(data));
      updateButtonStates("table");
    };
    document.getElementById("btn-categories").onclick = () => {
      updateDisplay(showCategories(data));
      updateButtonStates("categories");
    };
    document.getElementById("btn-stats").onclick = () => {
      updateDisplay(showStats(data));
      updateButtonStates("stats");
    };

    updateDisplay(showExternal(data));
    updateButtonStates("external");
    console.log("Application ready!");
  } catch (error) {
    console.error("Application failed to start:", error);
    showError(error.message);
  }
});
