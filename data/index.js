let x;
let index;
let today = new Date();
let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
let localIP;
let clientIP;
let CurrentTideValue = 0.00;
let CurrentTideTime = date + ' ' + time;
let Sensor_Location = "";
let Sensor_TimeZone = "";
let Sensor_M_F = 0
let Sensor_Offset = "";
let Sensor_MeasurementInterval = "";
let Sensor_Latitude = 0;
let Sensor_Longitude = 0;
let WiFi_STA_SSID = "";
let WiFi_STA_Password = "";
let FTP_Server = "";
let FTP_User = "";
let FTP_Pass = "";

var wsURL = 'ws://TowerTideGauge.local:81';
var wsConnection;
var wsIP;
var json;
var jsonObj;
var compiledJSON;
var TideHistory;
var TideTable = [];
var TideReadings = [];
var TideTimes = [];
var TideDates = [];

var PasswordSaved = false;
var SettingsOpen = false;
let map;

function SetTime() {
    var now = new Date();
    wsConnection.send("^Time:" + now)
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("TideTable").style.display = "none";
    wsConnection = new WebSocket(wsURL);
    wsConnection.onopen = function () {
        console.log("WebSocket Connection Made");
        wsConnection.send("SETTINGS");
        wsConnection.send("HIS");
        wsConnection.send("SN");
        wsConnection.send("IP");
    }

    wsConnection.onerror = function (error) {
        console.log('WebSocket Error ' + error);
        setTimeout(function () { window.location.reload(true); }, 10);;
    }

    wsConnection.onclose = function (e) {
        console.log("Disconnected from WebSocket, Attempting reconnect.")
        setTimeout(function () { window.location.reload(true); }, 1000);
    }

    wsConnection.onmessage = function (e) {
        var words = e.data.split("|")
        var i;
        switch (words[0]) {
            case "$TIDE":


                break;
            case "HIS":
                TideHistory = words[1];
                BuildTideTable();
                BuildChart();
                window.chart.update();
                break;
            case "DLH":
                TideHistory = words[1];
                DownloadFile("ExportedTides.csv", TideHistory);
                break;
            case "SETTINGS":
                json = JSON.parse(words[1]);
                DecodeSettingsJSON(json);
                LoadSettings();
                break;
            case "Networks":
                document.getElementById("ScanNetworkModal").style.display = "block";
                if (words[1] == "No Networks Found") {
                    alert("No Networks Found");
                } else {
                    DecodeNetworks(words)
                }
                break;
            case "PWD":
                if (words[1] == 'TRUE') {
                    PasswordSaved = true
                    CloseNavMenu()
                    OpenSettings()
                } else {
                    alert('Incorrect Password')
                    CloseNavMenu()
                    document.getElementById("Password").value = ""
                }
                break;
            case "IP":
                var IP = words[1].split(",")
                localIP = IP[0];
                clientIP = IP[1];
                document.getElementById("clientIP").innerHTML = clientIP
                document.getElementById("localIP").innerHTML = localIP

                break;
            default:
                console.log(words[0] + ' Recieved');
                break;
        }
    }
});
function OpenNavMenu() {
    if (PasswordSaved == true) {
        OpenSettings()
    } else {
        if (SettingsOpen == false) {
            document.getElementById("PasswordForm").style.height = "100%";
            document.getElementById("PasswordForm").style.width = "100%";
        } else {
            document.getElementById("SettingsContainer").style.display == "none";
        }
    }
}
function CloseNavMenu() {
    document.getElementById("PasswordForm").style.height = "0%";
    document.getElementById("PasswordForm").style.width = "0%";
}
function OpenSettings() {
    if (SettingsOpen == true) {
        SettingsOpen = false;
        document.getElementById("SettingsContainer").style.display = "none";
    } else {
        SettingsOpen = true;
        document.getElementById("SettingsContainer").style.display = "block";
    }
}
async function GetJSON() {
    const responce = await fetch('http://towertidegauge.local/config.json');
    json = await responce.text();
    DecodeSettingsJSON(json);
    LoadSettings();
}
async function GetTideData() {
    const responce = await fetch('http://towertidegauge.local/tides.csv');
    TideHistory = await responce.text();
    BuildTideTable();
    BuildChart();
    window.chart.update();
}
function AdminCheck() {
    var pass = document.getElementById("Password").value;
    pass = '#' + pass
    wsConnection.send(pass);
}
function BuildChart() {
    var ctx = document.getElementById('TideChart').getContext('2d');
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
                display: false,
                text: Sensor_Location
            },
            tooltips: {
                mode: 'index',
                intersect: true,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                yAxes: [{
                    ticks: {
                        callback: function (value, index, values) { return value; }
                    }
                }]
            }
        }
    });
}
function BuildTideTable() {
    var TideTable_ = document.getElementById("TideTable");
    TideTable_.innerHTML = ""; //remove all child elements inside of myDiv
    var reading = TideHistory.split("\r\n")
    var len = reading.length;
    var i = 0;
    var range = 0;

    if (len > 50) {
        range = (len - 50);
    } else {
        range = 1;
    }
    var cnt = 0;
    TideTable = [];
    TideReadings = [];
    TideTimes = [];
    TideDates = [];
    for (let index = 0; index < (len - 1); index++) {
        let tSplit = reading[index].split(",");
        const data = {
            DATE: tSplit[6],
            TIME: tSplit[7],
            TIDE: Number.parseFloat(parseFloat(tSplit[8])).toFixed(2)
        };
        if (i >= 0) {
            CurrentTideTime = data.DATE + " " + data.TIME
            CurrentTideValue = data.TIDE;
            document.getElementById("CurrentTideValue").innerHTML = CurrentTideValue
            document.getElementById("CurrentTideTime").innerHTML = CurrentTideTime
        }
        TideTable.push(data);
        if (index >= 50) {
            TideDates.push(tSplit[6]);
            TideTimes.push(tSplit[7]);
            TideReadings.push(Number.parseFloat(parseFloat(tSplit[8])).toFixed(2));
        }
    }

    AssignTideDivs(-1)
    for (let index = TideTable.length - 1; index > -1; index--) {
        const element = TideTable[index];
        AssignTideDivs(index);
    }
}
function AssignTideDivs(index) {
    var TideTable_ = document.getElementById("TideTable");
    var div = document.createElement("div");
    div.id = 'TideReading';
    div.style.display = 'block';
    div.style.margin = 'auto';
    var DateDiv = document.createElement("div");
    var TimeDiv = document.createElement("div");
    var TideDiv = document.createElement("div");
    DateDiv.id = 'TideReadingData';
    TimeDiv.id = 'TideReadingData';
    TideDiv.id = 'TideReadingData';
    if (index == -1) {
        var Date = document.createTextNode('DATE');
        var Time = document.createTextNode('TIME');
        var Tide = document.createTextNode('TIDE');
    } else {
        var Date = document.createTextNode(TideTable[index].DATE);
        var Time = document.createTextNode(TideTable[index].TIME);
        var Tide = document.createTextNode(TideTable[index].TIDE);
    }
    DateDiv.appendChild(Date);
    TimeDiv.appendChild(Time);
    TideDiv.appendChild(Tide);
    Number.id = 'TideReadingData';
    Date.id = 'TideReadingData';
    Time.id = 'TideReadingData';
    Tide.id = 'TideReadingData';
    div.appendChild(DateDiv);
    div.appendChild(TimeDiv);
    div.appendChild(TideDiv);
    TideTable_.appendChild(div);
}
function ShowHistory() {
    if (document.getElementById("TideTable").style.display == "none") {
        document.getElementById("TideTable").style.display = "block";
        document.getElementById("tidehistory").innerHTML = "History &#x2191;"

    }
    else {
        document.getElementById("TideTable").style.display = "none";
        document.getElementById("tidehistory").innerHTML = "History &#x2193"
    }
}
function ToggleMeasurementUnits() {
    if (document.getElementById("Sensor_M_F").value == 0) {
        document.getElementById("CurrentTideUnits").innerHTML = "(m)"
    } else {
        document.getElementById("CurrentTideUnits").innerHTML = "(f)"
    }
}
function SaveSettings() {
    if (confirm("Save Settings? Page will reload after save.")) {
        Sensor_Country = document.getElementById("Sensor_Country").value;
        Sensor_Location = document.getElementById("Sensor_Location").value;
        Sensor_TimeZone = document.getElementById("Sensor_TimeZone").value;
        Sensor_Type = document.getElementById("Sensor_Type").value;
        Sensor_Offset = document.getElementById("Sensor_Offset").value;
        Sensor_M_F = document.getElementById("Sensor_M_F").value;
        Sensor_MeasurementInterval = document.getElementById("Sensor_MeasurementInterval").value;
        Sensor_Latitude = document.getElementById("Sensor_Latitude").value;
        Sensor_Longitude = document.getElementById("Sensor_Longitude").value;
        WiFi_STA_SSID = document.getElementById("WiFi_STA_SSID").value;
        WiFi_STA_Password = document.getElementById("WiFi_STA_Password").value;
        WiFi_udpPort = document.getElementById("WiFi_udpPort").value;
        WiFi_tcpPort = document.getElementById("WiFi_tcpPort").value;
        FTP_Server = document.getElementById("FTP_Server").value;
        FTP_User = document.getElementById("FTP_User").value;
        FTP_Pass = document.getElementById("FTP_Pass").value;
        document.getElementById("SettingsContainer").style.display = "none";
        BuildJSON();
        console.log("JSON Built.");
        wsConnection.send(compiledJSON);
        console.log("JSON Sent.");
        console.log("Settings Requested.");
        ToggleMeasurementUnits();

        wsConnection.send("RESET")
        setTimeout(function () {
            window.location.reload(true);
        }, 5000);;
    }
}
function BuildJSON() {
    jsonObj = {
        "Sensor_Latitude": Sensor_Latitude,
        "Sensor_Longitude": Sensor_Longitude,
        "Sensor_Country": Sensor_Country,
        "Sensor_Location": Sensor_Location,
        "Sensor_TimeZone": Sensor_TimeZone,
        "Sensor_Offset": Sensor_Offset,
        "Sensor_M_F": Sensor_M_F,
        "Sensor_Type": Sensor_Type,
        "Sensor_MeasurementInterval": Sensor_MeasurementInterval,
        "WiFi_STA_SSID": WiFi_STA_SSID,
        "WiFi_STA_Password": WiFi_STA_Password,
        "WiFi_udpPort": WiFi_udpPort,
        "WiFi_tcpPort": WiFi_tcpPort,
        "FTP_Server": FTP_Server,
        "FTP_User": FTP_User,
        "FTP_Pass": FTP_Pass,
    };
    compiledJSON = JSON.stringify(jsonObj)
}
function DecodeNetworks(_message) {
    var element = document.getElementById("FoundNetworks");
    const part = _message[1].split("*");
    for (index = 0; index < part.length; index++) {
        var para = document.createElement("div");
        para.className = ("CreatedNetworkElement");
        para.addEventListener("click", () => {
            ChangeSelectedNetworkID(event)
        })
        var node = document.createTextNode(part[index]);
        para.appendChild(node);
        element.appendChild(para);

    }
}
function ChangeSelectedNetworkID(e) {
    var selectedAP = e.currentTarget.innerHTML.split(",");
    document.getElementById("WiFi_STA_SSID").value = selectedAP[1];
    document.getElementById("WiFi_STA_Password").value = "";
    CloseModal()
}
function CloseModal() {
    document.getElementById("ScanNetworkModal").style.display = "none";
}
function RefreshNetworklist() {
    document.getElementById("FoundNetworks").innerHTML = "";
    ScanNetworks()
}
function SelectNetwork() {
    CloseModal()
}
function ScanNetworks() {
    wsConnection.send("SWN");
}
function DecodeSettingsJSON(doc) {
    Sensor_Latitude = doc.Sensor_Latitude
    Sensor_Longitude = doc.Sensor_Longitude
    Sensor_Location = doc.Sensor_Location;
    Sensor_TimeZone = doc.Sensor_TimeZone;
    Sensor_Country = doc.Sensor_Country;
    Sensor_Type = doc.Sensor_Type;
    Sensor_M_F = doc.Sensor_M_F;
    Sensor_Offset = doc.Sensor_Offset;
    Sensor_MeasurementInterval = doc.Sensor_MeasurementInterval;
    WiFi_STA_SSID = doc.WiFi_STA_SSID;
    WiFi_STA_Password = doc.WiFi_STA_Password;
    WiFi_udpPort = doc.WiFi_udpPort;
    WiFi_tcpPort = doc.WiFi_tcpPort;
    FTP_Server = doc.FTP_Server;
    FTP_User = doc.FTP_User;
    FTP_Pass = doc.FTP_Pass;

    
}
function LoadSettings() {
    document.getElementById("CurrentLocation").innerHTML = Sensor_Location;
    document.getElementById("Sensor_Latitude").value = Sensor_Latitude;
    document.getElementById("Sensor_Longitude").value = Sensor_Longitude;
    document.getElementById("Sensor_Location").value = Sensor_Location;
    document.getElementById("Sensor_TimeZone").value = Sensor_TimeZone;
    document.getElementById("Sensor_Country").value = Sensor_Country;
    document.getElementById("Sensor_Type").value = Sensor_Type;
    document.getElementById("Sensor_M_F").value = Sensor_M_F;
    document.getElementById("Sensor_Offset").value = Sensor_Offset;
    document.getElementById("Sensor_MeasurementInterval").value = Sensor_MeasurementInterval;
    document.getElementById("WiFi_STA_SSID").value = WiFi_STA_SSID;
    document.getElementById("WiFi_STA_Password").value = WiFi_STA_Password;
    document.getElementById('WiFi_udpPort').value = WiFi_udpPort
    document.getElementById('WiFi_tcpPort').value = WiFi_tcpPort
    document.getElementById("FTP_Server").value = FTP_Server;
    document.getElementById('FTP_User').value = FTP_User
    document.getElementById('FTP_Pass').value = FTP_Pass

    ToggleMeasurementUnits()
}
function ExportTideHistory() {
    DownloadFile("ExportedTides.csv", TideHistory);
}
function ExportSettings() {
    BuildJSON();
    DownloadFile("ExportedSettings.json", compiledJSON);
}
function DownloadFile(filename, data) {
    var element = document.createElement('a');
    element.style.display = 'none';
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', filename);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function DeleteTideHistory() {
    // Confirm Window
    if (confirm("Confirm Delete Tide History")) {
        wsConnection.send("DTH");
        setTimeout(function () {
            window.location.reload(true);
        }, 3000);;
    }
}
function RestartESP() {
    if (confirm("Resart the Device? Page will reload.")) {
        wsConnection.send("RESET")
        setTimeout(function () {
            window.location.reload(true);
        }, 2000);;
    }
}
function UpdateESP() {
    if ((window.location.hostname) == '127.0.0.1') {
        window.location = 'http://TowerTideGauge.local/update'
    }
    else {
        window.location = '/update';
    }
}





