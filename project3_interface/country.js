// country.js  - the country view
// pick a country from the dropdown to see its stats


// API URL from disease.sh
const API_COUNTRIES = 'https://disease.sh/v3/covid-19/countries';

// colors matching the CSS
const COLOR_SAFFRON = '#f4b942';
const COLOR_POMEGRANATE = '#d64545';
const COLOR_JADE = '#5fa890';
const COLOR_NIGHT = '#1a2444';
const COLOR_CREAM = '#f5ecd7';

// store all countries here so we can find them when the dropdown changes
let allCountries = [];

// the chart variable - we need to keep track of it so we can destroy it
// before drawing a new one (otherwise charts stack on top of each other)
let myChart = null;


// turns big numbers into something readable like "1,234,567"
function formatNumber(num) {
    return num.toLocaleString('en-US');
}


// fills the dropdown with all the country names
function fillDropdown() {
    const select = document.getElementById('country-select');

    // sort the countries alphabetically
    allCountries.sort(function(a, b) {
        if (a.country < b.country) return -1;
        if (a.country > b.country) return 1;
        return 0;
    });

    // make an option for each country
    for (let i = 0; i < allCountries.length; i++) {
        const option = document.createElement('option');
        option.value = allCountries[i].country;
        option.textContent = allCountries[i].country;
        // make USA the default
        if (allCountries[i].country === 'USA') {
            option.selected = true;
        }
        select.appendChild(option);
    }
}


// shows all the info for one country
function showCountry(country) {
    // flag and name at the top
    document.getElementById('country-flag').src = country.countryInfo.flag;
    document.getElementById('country-flag').alt = 'flag of ' + country.country;
    document.getElementById('country-name').textContent = country.country;
    document.getElementById('country-meta').textContent =
        'pop. ' + formatNumber(country.population) + ' · ' + country.continent;

    // stat cards
    document.getElementById('stat-cases').textContent = formatNumber(country.cases);
    document.getElementById('stat-recovered').textContent = formatNumber(country.recovered);
    document.getElementById('stat-active').textContent = formatNumber(country.active);
    document.getElementById('stat-deaths').textContent = formatNumber(country.deaths);

    // trend lines
    document.getElementById('trend-cases').textContent = '+' + formatNumber(country.todayCases) + ' today';
    document.getElementById('trend-recovered').textContent = '+' + formatNumber(country.todayRecovered) + ' today';
    document.getElementById('trend-active').textContent = formatNumber(country.critical) + ' critical';
    document.getElementById('trend-deaths').textContent = '+' + formatNumber(country.todayDeaths) + ' today';

    // draw the chart
    drawChart(country);
}


// draws the doughnut chart for one country
function drawChart(country) {
    const ctx = document.getElementById('country-chart').getContext('2d');

    // if there is already a chart, destroy it first
    // otherwise the new chart shows up on top of the old one
    if (myChart !== null) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['recovered', 'active', 'lost'],
            datasets: [{
                data: [country.recovered, country.active, country.deaths],
                backgroundColor: [COLOR_JADE, COLOR_SAFFRON, COLOR_POMEGRANATE],
                borderColor: COLOR_NIGHT,
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: COLOR_CREAM }
                }
            }
        }
    });
}


// runs when the dropdown changes 
function whenDropdownChanges() {
    const select = document.getElementById('country-select');
    const chosenName = select.value;

    // find the country object that matches the chosen name
    let chosenCountry = null;
    for (let i = 0; i < allCountries.length; i++) {
        if (allCountries[i].country === chosenName) {
            chosenCountry = allCountries[i];
        }
    }

    if (chosenCountry !== null) {
        showCountry(chosenCountry);
    }
}


// the main function 
async function loadData() {
    try {
        // fetch all the countries
        const response = await fetch(API_COUNTRIES);
        const data = await response.json();

        // store the data so we can access it later
        allCountries = data;

        // hide the loading message - show the content
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

        // fill the dropdown menu
        fillDropdown();

        // listen for when the user changes the dropdown
        const select = document.getElementById('country-select');
        select.addEventListener('change', whenDropdownChanges);

        // show USA by default - since it's the first selected option
        whenDropdownChanges();

    } catch (error) {
        // if there is an error
        console.log('Error loading data:', error);
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }
}


// runs loadData() when the page loads
loadData();
