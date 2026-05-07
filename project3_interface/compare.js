// compare.js  - the compare view
// pick two countries to compare them side by side


// API URL from disease.sh
const API_COUNTRIES = 'https://disease.sh/v3/covid-19/countries';

// colors matching the CSS
const COLOR_SAFFRON = '#f4b942';
const COLOR_JADE = '#5fa890';
const COLOR_CREAM = '#f5ecd7';

// store all countries here so we can find them when dropdowns change
let allCountries = [];

// chart variable so we can destroy the old chart before drawing a new one
let myChart = null;


// turns big numbers into something readable like "1,234,567"
function formatNumber(num) {
    return num.toLocaleString('en-US');
}


// fills both dropdowns with country names
function fillDropdowns() {
    const selectA = document.getElementById('country-a');
    const selectB = document.getElementById('country-b');

    // sort countries alphabetically
    allCountries.sort(function(a, b) {
        if (a.country < b.country) return -1;
        if (a.country > b.country) return 1;
        return 0;
    });

    // add an option for each country (USA default for A, UAE default for B)
    for (let i = 0; i < allCountries.length; i++) {
        // option for dropdown A
        const optionA = document.createElement('option');
        optionA.value = allCountries[i].country;
        optionA.textContent = allCountries[i].country;
        if (allCountries[i].country === 'USA') {
            optionA.selected = true;
        }
        selectA.appendChild(optionA);

        // option for dropdown B
        const optionB = document.createElement('option');
        optionB.value = allCountries[i].country;
        optionB.textContent = allCountries[i].country;
        if (allCountries[i].country === 'UAE') {
            optionB.selected = true;
        }
        selectB.appendChild(optionB);
    }
}


// finds a country object by its name
function findCountry(name) {
    for (let i = 0; i < allCountries.length; i++) {
        if (allCountries[i].country === name) {
            return allCountries[i];
        }
    }
    return null;
}


// makes one row in the stats list
// the higherSide tells us which country has the bigger number ('a', 'b', or 'tie')
function makeRow(label, value, isHigher) {
    const row = document.createElement('div');
    row.className = 'compare-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = label;

    const valueSpan = document.createElement('span');
    // if this country has the higher number give it the .higher class - which makes it pomegranate
    if (isHigher) {
        valueSpan.className = 'value higher';
    } else {
        valueSpan.className = 'value';
    }
    valueSpan.textContent = formatNumber(value);

    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    return row;
}


// fills in the side by side columns 
function showColumns(countryA, countryB) {
    // flags and names at the top of each column
    document.getElementById('flag-a').src = countryA.countryInfo.flag;
    document.getElementById('flag-a').alt = 'flag of ' + countryA.country;
    document.getElementById('name-a').textContent = countryA.country;

    document.getElementById('flag-b').src = countryB.countryInfo.flag;
    document.getElementById('flag-b').alt = 'flag of ' + countryB.country;
    document.getElementById('name-b').textContent = countryB.country;

    // grab the stat containers
    const statsA = document.getElementById('stats-a');
    const statsB = document.getElementById('stats-b');

    // clear them out from the last comparison
    statsA.innerHTML = '';
    statsB.innerHTML = '';

    // CASES row
    // figure out which country has more cases - the bigger one gets the .higher class
    let casesAisHigher = false;
    let casesBisHigher = false;
    if (countryA.cases > countryB.cases) {
        casesAisHigher = true;
    } else if (countryB.cases > countryA.cases) {
        casesBisHigher = true;
    }
    statsA.appendChild(makeRow('total cases', countryA.cases, casesAisHigher));
    statsB.appendChild(makeRow('total cases', countryB.cases, casesBisHigher));

    // RECOVERED row
    let recoveredAisHigher = false;
    let recoveredBisHigher = false;
    if (countryA.recovered > countryB.recovered) {
        recoveredAisHigher = true;
    } else if (countryB.recovered > countryA.recovered) {
        recoveredBisHigher = true;
    }
    statsA.appendChild(makeRow('recovered', countryA.recovered, recoveredAisHigher));
    statsB.appendChild(makeRow('recovered', countryB.recovered, recoveredBisHigher));

    // ACTIVE row
    let activeAisHigher = false;
    let activeBisHigher = false;
    if (countryA.active > countryB.active) {
        activeAisHigher = true;
    } else if (countryB.active > countryA.active) {
        activeBisHigher = true;
    }
    statsA.appendChild(makeRow('active', countryA.active, activeAisHigher));
    statsB.appendChild(makeRow('active', countryB.active, activeBisHigher));

    // DEATHS row
    let deathsAisHigher = false;
    let deathsBisHigher = false;
    if (countryA.deaths > countryB.deaths) {
        deathsAisHigher = true;
    } else if (countryB.deaths > countryA.deaths) {
        deathsBisHigher = true;
    }
    statsA.appendChild(makeRow('deaths', countryA.deaths, deathsAisHigher));
    statsB.appendChild(makeRow('deaths', countryB.deaths, deathsBisHigher));
}


// draws the bar chart that compares 2 countries
function drawChart(countryA, countryB) {
    const ctx = document.getElementById('compare-chart').getContext('2d');

    // destroy the old chart before drawing a new one
    if (myChart !== null) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['total cases', 'recovered', 'active', 'deaths'],
            datasets: [
                {
                    label: countryA.country,
                    data: [countryA.cases, countryA.recovered, countryA.active, countryA.deaths],
                    backgroundColor: COLOR_SAFFRON
                },
                {
                    label: countryB.country,
                    data: [countryB.cases, countryB.recovered, countryB.active, countryB.deaths],
                    backgroundColor: COLOR_JADE
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: COLOR_CREAM }
                }
            },
            scales: {
                x: {
                    ticks: { color: COLOR_CREAM }
                },
                y: {
                    ticks: { color: COLOR_CREAM }
                }
            }
        }
    });
}


// the main function that updates the page when either dropdown changes
function whenDropdownChanges() {
    const nameA = document.getElementById('country-a').value;
    const nameB = document.getElementById('country-b').value;

    const countryA = findCountry(nameA);
    const countryB = findCountry(nameB);

    if (countryA !== null && countryB !== null) {
        showColumns(countryA, countryB);
        drawChart(countryA, countryB);
    }
}


// the main function 
async function loadData() {
    try {
        // fetch all the countries
        const response = await fetch(API_COUNTRIES);
        const data = await response.json();

        allCountries = data;

        // hide loading - show content
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

        fillDropdowns();

        // listen for changes on both dropdowns
        document.getElementById('country-a').addEventListener('change', whenDropdownChanges);
        document.getElementById('country-b').addEventListener('change', whenDropdownChanges);

        // show the default comparison (USA vs UAE)
        whenDropdownChanges();

    } catch (error) {
        console.log('Error loading data:', error);
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }
}


// run loadData() when the page loads
loadData();
