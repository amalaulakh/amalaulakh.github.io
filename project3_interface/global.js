// global.js  - the world view
// shows worldwide stats, top 10 countries, and a doughnut chart


// API URLs from disease.sh
const API_GLOBAL = 'https://disease.sh/v3/covid-19/all';
const API_COUNTRIES = 'https://disease.sh/v3/covid-19/countries';

// my color variables matching the CSS
const COLOR_SAFFRON = '#f4b942';
const COLOR_POMEGRANATE = '#d64545';
const COLOR_JADE = '#5fa890';
const COLOR_NIGHT = '#1a2444';
const COLOR_CREAM = '#f5ecd7';


// turns 1234567 into "1,234,567" so it's easier to read
function formatNumber(num) {
    return num.toLocaleString('en-US');
}


// fills in the four stat cards at the top of the page
function showStats(data) {
    document.getElementById('stat-cases').textContent = formatNumber(data.cases);
    document.getElementById('stat-recovered').textContent = formatNumber(data.recovered);
    document.getElementById('stat-active').textContent = formatNumber(data.active);
    document.getElementById('stat-tests').textContent = formatNumber(data.tests);

    // little trend lines under each stat
    document.getElementById('trend-cases').textContent = '+' + formatNumber(data.todayCases) + ' today';
    document.getElementById('trend-recovered').textContent = '+' + formatNumber(data.todayRecovered) + ' today';
    document.getElementById('trend-active').textContent = formatNumber(data.critical) + ' critical';
    document.getElementById('trend-tests').textContent = formatNumber(data.testsPerOneMillion) + ' / million';
}


// makes the bar chart of the top 10 countries by cases
function showTopCountries(countries) {
    // sort countries by total cases (highest first), then take the first 10
    countries.sort(function(a, b) {
        return b.cases - a.cases;
    });
    const top10 = countries.slice(0, 10);

    // pull out the names and case counts into separate arrays for chart.js
    const countryNames = [];
    const caseCounts = [];
    for (let i = 0; i < top10.length; i++) {
        countryNames.push(top10[i].country);
        caseCounts.push(top10[i].cases);
    }

    // make the chart
    const ctx = document.getElementById('countries-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: countryNames,
            datasets: [{
                label: 'total cases',
                data: caseCounts,
                backgroundColor: COLOR_SAFFRON,
                hoverBackgroundColor: COLOR_POMEGRANATE
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // makes the bars horizontal
            plugins: {
                legend: { display: false }
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


// makes the doughnut chart showing how cases break down globally
function showBreakdown(data) {
    const ctx = document.getElementById('breakdown-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['recovered', 'active', 'lost'],
            datasets: [{
                data: [data.recovered, data.active, data.deaths],
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


// the main function 
async function loadData() {
    try {
        // fetch global data
        const globalResponse = await fetch(API_GLOBAL);
        const globalData = await globalResponse.json();

        // fetch all countries data
        const countriesResponse = await fetch(API_COUNTRIES);
        const countriesData = await countriesResponse.json();

        // hide the loading message and show the content
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

        // call the functions to fill in the page
        showStats(globalData);
        showTopCountries(countriesData);
        showBreakdown(globalData);

    } catch (error) {
        // if anything goes wrong - show the error message
        console.log('Error loading data:', error);
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }
}


// run loadData when the page is ready
loadData();
