// ============================================
// DATA LOADING
// ============================================

async function loadData() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    console.log("data loaded", data);
    return data.features;
  } catch (error) {
    console.error("Failed to load data:", error);
    throw new Error("Could not load data from API");
  }
}

export default loadData;
