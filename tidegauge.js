let readings;
let lat, lon, sn, nm, tide, units, time
let recordedTidesAddress;
let predictedTidesAddress;
let readingsCount = 0;

let TideReadings = [], TideTimes = [], TideDates = [], TideLevel = [], TideHistory = "", TidePredictions = "";
let PredictedTideReadings = [], PredictedTideTimes = [], PredictedTideDates = [], PredictedTideLevel = [];
Chart.defaults.elements.bar.borderWidth = 10;

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("TidePrediction").style.display = "none";
    document.getElementById("TideTable").style.display = "none";
    setTimeout(function () { window.location.reload(true); }, 30000);
    sn = location.search.substring(9);
    recordedTidesAddress = "/data/gettidedata.php?_serial=".concat(sn);
    GetTideGaugeData();


});

function BuildTextFile() {
    let dataString = "DATE,TIME,TIDE\n";
    dataString = dataString.concat(TideHistory)
    saveFile(readings)
}
async function saveFile(text) {

    let tidesoutput = [];
    const opts = {
        types: [
            {
                description: ".csv file",
                accept: { "text/plain": [".csv"] },
            },
        ],
    };
    let output = "_header,_serial,_country,_loc,_lat,_lon,_date,_time,_tide,_units\n";
    try {
        for (let index = 0; index < text.length; index++) {
            const element = text[index];

            element["_units"] = element["_units"].charAt(0);

            output += "$TIDE," +
                element["_serial"] + "," +
                element["_country"] + "," +
                element["_loc"] + "," +
                element["_lat"] + "," +
                element["_lon"] + "," +
                element["_date"] + "," +
                element["_time"] + "," +
                element["_tide"] + "," +
                element["_units"] + "\n";


        }

        // create a new handle
        const newHandle = await window.showSaveFilePicker(opts);
        // create a FileSystemWritableFileStream to write to
        const writableStream = await newHandle.createWritable();
        // write our file
        await writableStream.write(output);
        // close the file and write the contents to disk.
        await writableStream.close();
    } catch (err) {
        console.error(err.name, err.message);
    }
}
function GetTideGaugeData() {
    const ajax = new XMLHttpRequest();
    ajax.open("GET", recordedTidesAddress, true);
    ajax.send();

    ajax.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            TideHistory = this.responseText
            readings = JSON.parse(this.responseText);
            readingsCount = readings.length;
            document.getElementById("TideTable").innerHTML = "";
            BuildTideTable(readings, "Read");
            BuildTideChart();
            GetPredictedTideGaugeData();
        }
    };
}

function GetPredictedTideGaugeData() {
    predictedTidesAddress =
        "https://www.worldtides.info/api/v3?datum=CD&Heights" +
        "&key=dd85c7e1-09ca-45df-9534-bc2ed8dcc9a7" +
        "&lat=" + lat +
        "&lon=" + lon +
        "&stationDistance=10" +
        "days=7";

    const ajax = new XMLHttpRequest();
    ajax.open("GET", predictedTidesAddress, true);
    ajax.send();

    ajax.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            predictions = JSON.parse(this.responseText);
            document.getElementById("TidePrediction").innerHTML = "";
            BuildTideTable(predictions.heights, "Predicted");
            BuildPredictedChart();
            readingsCount = predictions.length;
        }
    };
}



function BuildTideTable(data, tp) {
    let r = data.length;
    if (tp == "Read" || r >= 100) { r = 100 }
    for (let i = -1; i < r; i++) { AssignTideDivs(data, i, tp); }
}

function AssignTideDivs(data, i, tp) {
    let Number, Date, Time, Tide;
    let div = document.createElement("div");
    div.id = 'TideReading';
    const DateDiv = document.createElement("div");
    const TimeDiv = document.createElement("div");
    const TideDiv = document.createElement("div");
    DateDiv.id = 'TideReadingData';
    TimeDiv.id = 'TideReadingData';
    TideDiv.id = 'TideReadingData';
    if (i == -1) {
        Date = document.createTextNode('DATE');
        Time = document.createTextNode('TIME');
        Tide = document.createTextNode('TIDE');
    }
    else {
        if (tp == "Read") {
            if (data[i]["_serial"] != sn) { return; }
            if (data[i]["_country"] == "") { return; }
            let dt = data[i]["_date"] + " " + data[i]["_time"];
            dt = dt.substring(0, dt.length - 3);
            document.getElementById("CurrentLocation").innerHTML = data[i]["_loc"];
            document.getElementById("CurrentTideTime").innerHTML = dt;
            document.getElementById("CurrentTideValue").innerHTML = parseFloat(data[i]["_tide"]).toFixed(2);
            let md = data[i]["_date"].substring(data[i]["_date"].indexOf("-") + 1)
            TideDates.push(md);
            TideTimes.push(data[i]["_time"]);
            TideReadings.push(parseFloat(data[i]["_tide"]).toFixed(2));
            Date = document.createTextNode(md);
            Time = document.createTextNode(data[i]["_time"]);
            Tide = document.createTextNode(data[i]["_tide"].concat(data[i]["_units"]));
        }
        if (tp == "Predicted") {
            let indicator = "▲"
            if (data[i]["type"] == "Low") { indicator = "▼" }
            let td = indicator + " " + data[i]["height"];
            let dt = data[i].date.split("T");
            let tm = dt[1].substring(0, dt[1].indexOf("+"));
            let md = data[i].date.substring(5, data[i].date.indexOf("T"))
            let combined = md + " " + tm;

            PredictedTideDates.push(combined);
            PredictedTideTimes.push(tm);
            PredictedTideReadings.push(parseFloat(data[i].height).toFixed(2));
            Date = document.createTextNode(dt[0]);
            Time = document.createTextNode(tm);
            Tide = document.createTextNode(td);
        }
    }
    DateDiv.appendChild(Date);
    TimeDiv.appendChild(Time);
    TideDiv.appendChild(Tide);
    Date.id = 'TideReadingData';
    Time.id = 'TideReadingData';
    Tide.id = 'TideReadingData';
    div.appendChild(DateDiv);
    div.appendChild(TimeDiv);
    div.appendChild(TideDiv);
    if (tp == "Read") {
        document.getElementById("TideTable").appendChild(div);
    }
    if (tp == "Predicted") {
        document.getElementById("TidePrediction").appendChild(div);
    }
}

function BuildTideChart() {
    let ctx = document.getElementById('TideChart');
    window.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: TideTimes,
            datasets: [
                {
                    label: 'Tide Readings',
                    backgroundColor: 'blue',
                    borderColor: 'black',
                    data: TideReadings,
                    fill: true,
                    borderWidth: 1
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
            }
        }
    });
}
function BuildPredictedChart() {

    let ptx = document.getElementById('PredictedTideChart');

    window.chart = new Chart(ptx, {
        type: 'line',
        data: {
            labels: PredictedTideDates,
            datasets: [
                {
                    label: 'Predicted',
                    backgroundColor: 'lightblue',
                    borderColor: 'black',
                    data: PredictedTideReadings,
                    fill: true,
                    borderWidth: 1
                }

            ]
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

function ShowHistory() {
    if (document.getElementById("TideTable").style.display == "none") {
        document.getElementById("TideTable").style.display = "block";
        document.getElementById("tidehistory").innerHTML = "History ▲"

    }
    else {
        document.getElementById("TideTable").style.display = "none";
        document.getElementById("tidehistory").innerHTML = "History ▼";
    }
}
function ShowPrediction() {
    if (document.getElementById("TidePrediction").style.display == "none") {
        document.getElementById("TidePrediction").style.display = "block";
        document.getElementById("PredictionsTable").innerHTML = "Predictions ▲";
    }
    else {
        document.getElementById("TidePrediction").style.display = "none";
        document.getElementById("PredictionsTable").innerHTML = "Predictions ▼"
    }
    //▲ ▼
}
