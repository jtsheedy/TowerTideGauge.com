let readings;
let lat, lon, sn, nm, tide, units, time
let req;

let TideReadings = [];
let TideTimes = [];
let TideDates = [];
let TideLevel = []
let dt;

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { window.location.reload(true); }, 300000);
    sn = location.search.substring(9);
    req = "tidegauge.php?_serial=".concat(sn);
    GetTideGaugeData();

});

function initMap() {
    var map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: parseFloat(lat), lng: parseFloat(lon) },
        zoom: 15,
        mapTypeId: 'satellite',
        disableDefaultUI: true,

    });

    const marker = new google.maps.Marker({
        position: { lat: parseFloat(lat), lng: parseFloat(lon) },
        map: map,
        scale: 0.1,
    });
}
function GetTideGaugeData() {
    const ajax = new XMLHttpRequest();
    ajax.open("GET", req, true);
    ajax.send();

    ajax.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            readings = JSON.parse(this.responseText);
            BuildTideTable();
            initMap();
            BuildChart();
        }
    };
}
function BuildTideTable() {
    document.getElementById("TideTable").innerHTML = "";
    for (let i = -1; i < 25; i++) { AssignTideDivs(i); }
}
function AssignTideDivs(i) {
    let Number;
    let Date;
    let Time;
    let Tide;
    let div = document.createElement("div");
    div.id = 'TideReading';
    div.style.display = 'block';
    div.style.margin = 'auto';
    var NumberDiv = document.createElement("div");
    var DateDiv = document.createElement("div");
    var TimeDiv = document.createElement("div");
    var TideDiv = document.createElement("div");
    NumberDiv.id = 'TideReadingData';
    DateDiv.id = 'TideReadingData';
    TimeDiv.id = 'TideReadingData';
    TideDiv.id = 'TideReadingData';
    if (i < 25 && i != -1) {
        dt = readings[i]["_time"].split(" ");
        TideReadings.push(parseFloat(readings[i]["_tide"]).toFixed(2));
        TideDates.push(dt[0]);
        let tt = dt[1].substring(0, 5)
        TideTimes.push(tt);
    }
    if (i == -1) {
        Number = document.createTextNode('NUM');
        Date = document.createTextNode('DATE');
        Time = document.createTextNode('TIME');
        Tide = document.createTextNode('TIDE');
    }
    else if (i == 0) {
        lat = readings[i]["_lat"];
        lon = readings[i]["_lon"];
        sn = readings[i]["_serial"];
        nm = readings[i]["_loc"];
        tide = readings[i]["_tide"];
        units = readings[i]["_units"];
        document.title = readings[i]["_loc"] + " Tide Data";

        document.getElementById("CurrentTideValue").innerHTML = readings[i]["_tide"].concat(readings[i]["_units"]);
        document.getElementById("CurrentTideTime").innerHTML = readings[i]["_time"]
        document.getElementById("CurrentLocation").innerHTML = readings[i]["_loc"];
        Number = document.createTextNode(readings.length - i);
        dt = readings[i]["_time"].split(" ");
        Date = document.createTextNode(dt[0]);
        Time = document.createTextNode(dt[1]);
        Tide = document.createTextNode(readings[i]["_tide"].concat(readings[i]["_units"]));
    } else {
        Number = document.createTextNode(readings.length - i);
        dt = readings[i]["_time"].split(" ");
        Date = document.createTextNode(dt[0]);
        Time = document.createTextNode(dt[1]);
        Tide = document.createTextNode(readings[i]["_tide"].concat(readings[i]["_units"]));
    }
    NumberDiv.appendChild(Number);
    DateDiv.appendChild(Date);
    TimeDiv.appendChild(Time);
    TideDiv.appendChild(Tide);
    Number.id = 'TideReadingData';
    Date.id = 'TideReadingData';
    Time.id = 'TideReadingData';
    Tide.id = 'TideReadingData';
    div.appendChild(NumberDiv);
    div.appendChild(DateDiv);
    div.appendChild(TimeDiv);
    div.appendChild(TideDiv);
    document.getElementById("TideTable").appendChild(div);
}
function BuildChart() {
    let ctx = document.getElementById('TideChart');
    window.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: TideTimes,
            datasets: [{
                label: 'Tide Readings',
                backgroundColor: 'blue',
                borderColor: 'darkblue',
                data: TideReadings,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: nm
            },
            tooltips: {
                mode: 'index',
                intersect: true,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
        }
    });
}

