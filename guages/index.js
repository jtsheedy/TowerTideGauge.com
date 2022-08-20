var x;
var index;
var FirmwareVersion = 0
var ServerFWLocation = "http://www.towersoftwareltd.com/versions/TideGauge_FW_Version.json"
var ServerFWVersion = 0;
var today = new Date();
var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var localIP;
var clientIP;
var CurrentTideValue = 0.00;
var CurrentTideTime = date + ' ' + time;
var Sensor_Location = "";
var Sensor_TimeZone = "";
var Sensor_M_F = 0
var Sensor_Offset = "";
var Sensor_AveragingReadTime = "";
var Sensor_MeasurementInterval = "";
var WiFi_SSID = "";
var WiFi_Password = "";
var Radio_OperationMode = 0;
var Radio_Activated = false;
var WebInterface = false
var WebUpload = false
var Latitude = 0;
var Longitude = 0;
var SerialNumber = 0;
var LicenseActivator = 0;

var wsURL = 'ws://TowerTideGauge.local:8080';
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
var TimeZones = ['Melbourne,Canberra,Sydney',
    'Perth',
    'Brisbane',
    'Adelaide',
    'Darwin',
    'Hobart',
    'Amsterdam,Netherlands',
    'Athens,Greece',
    'Barcelona,Spain',
    'Berlin,Germany',
    'Brussels,Belgium',
    'Budapest,Hungary',
    'Copenhagen,Denmark',
    'Dublin,Ireland',
    'Geneva,Switzerland',
    'Helsinki,Finland',
    'Kyiv,Ukraine',
    'Lisbon,Portugal',
    'London,GreatBritain',
    'Madrid,Spain',
    'Oslo,Norway',
    'Paris,France',
    'Prague,CzechRepublic',
    'Roma,Italy',
    'Moscow,Russia',
    'St.Petersburg,Russia',
    'Stockholm,Sweden',
    'Auckland, Wellington',
    'Hawaii Time',
    'Alaska Time',
    'Pacific Time',
    'Mountain Time',
    'Mountain Time (Arizona, no DST)',
    'Central Time',
    'Eastern Time',
    'Atlantic Time',
    'Jakarta',
    'Jerusalem',
    'Singapore',
    'Ulaanbaatar, Mongolia',
    'Brazil,Sao Paulo',
    'Argentina',
    'Central America'
];
var PasswordSaved = false;
var SettingsOpen = false;
let map;

function SetTime() {
    var now = new Date();
    wsConnection.send("^Time:" + now)
}

document.addEventListener("DOMContentLoaded", function() {

    
});

function ReadLicense() {
    if (Radio_Activated) {
        document.getElementById("ALRA").innerHTML = "Radio Activated = True";
    }
    if (WebUpload) {
        document.getElementById("ALWI").innerHTML = "Web Interface = True";
    }
    if (WebInterface) {
        document.getElementById("ALWU").innerHTML = "Web Upload = True";
    }
}

function SetFirmwareVersion() {
    document.getElementById("FirmwareVersion").innerHTML = FirmwareVersion;
    document.getElementById("ServerFWVersion").innerHTML = ServerFWVersion;
    if (ServerFWVersion != FirmwareVersion && ServerFWVersion != 0) {
        document.getElementById("FirmwareVersion").style.color = "red";
        document.getElementById("FWA").style.display = "block";
    } else {
        document.getElementById("ServerFWVersion").innerHTML = ServerFWVersion;
        document.getElementById("FWA").style.display = "none";
        document.getElementById("FWA").style.color = "none";
    }
}

function DownloadFirmware() {
    window.location = ServerFWLocation;
}

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
        document.getElementById("SaveButton").style.display = "none";
    } else {
        SettingsOpen = true;
        document.getElementById("SettingsContainer").style.display = "block";
        document.getElementById("SaveButton").style.display = "block";
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
                display: true,
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
                        callback: function(value, index, values) { return value; }
                    }
                }]
            }
        }
    });
}

function BuildTideTable() {
    var TideTable_ = document.getElementById("TideTable");
    TideTable_.innerHTML = ""; //remove all child elements inside of myDiv
    var reading = TideHistory.split("\n")
    var len = reading.length;
    var i = 0;
    var range = 0;

    if (len > 25) {
        range = (len - 25);
    } else {
        range = 1;
    }
    var cnt = 0;
    TideTable = [];
    TideReadings = [];
    TideTimes = [];
    TideDates = [];
    for (let index = 0; index < (reading.length - 1); index++) {
        let tSplit = reading[index].split(",");
        var data = { NUM: tSplit[0], DATE: tSplit[1], TIME: tSplit[2], TIDE: Number.parseFloat(parseFloat(tSplit[3])).toFixed(2) };
        TideTable.push(data);
        if (index >= reading.length - 25) {
            TideDates.push(tSplit[1]);
            TideTimes.push(tSplit[2]);
            TideReadings.push(Number.parseFloat(parseFloat(tSplit[3])).toFixed(2));
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
    var NumberDiv = document.createElement("div");
    var DateDiv = document.createElement("div");
    var TimeDiv = document.createElement("div");
    var TideDiv = document.createElement("div");
    NumberDiv.id = 'TideReadingData';
    DateDiv.id = 'TideReadingData';
    TimeDiv.id = 'TideReadingData';
    TideDiv.id = 'TideReadingData';
    if (index == -1) {
        var Number = document.createTextNode('NUM');
        var Date = document.createTextNode('DATE');
        var Time = document.createTextNode('TIME');
        var Tide = document.createTextNode('TIDE');
    } else {
        var Number = document.createTextNode(TideTable[index].NUM);
        var Date = document.createTextNode(TideTable[index].DATE);
        var Time = document.createTextNode(TideTable[index].TIME);
        var Tide = document.createTextNode(TideTable[index].TIDE);
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
    TideTable_.appendChild(div);
}


function ToggleMeasurementUnits() {
    if (document.getElementById("M_F").value == 0) {
        document.getElementById("CurrentTideUnits").innerHTML = "(m)"
    } else {
        document.getElementById("CurrentTideUnits").innerHTML = "(f)"
    }
}

function SaveSettings() {
    if (confirm("Save Settings? Page will reload after save.")) {
        document.getElementById("SettingsContainer").style.display = "none";
        Sensor_Location = document.getElementById("Sensor_Location").value;
        Sensor_TimeZone = document.getElementById("Sensor_TimeZone").value;
        Sensor_M_F = document.getElementById("M_F").value;
        Sensor_Type = document.getElementById("Sensor_Type").value;
        Sensor_Offset = document.getElementById("Sensor_Offset").value;
        Sensor_MeasurementInterval = document.getElementById("Sensor_MeasurementInterval").value;
        WiFi_SSID = document.getElementById("WiFi_SSID").value;
        WiFi_Password = document.getElementById("WiFi_Password").value;
        Radio_OperationMode = document.getElementById("Radio_OperationMode").value;
        Latitude = document.getElementById("Latitude").value;
        Longitude = document.getElementById("Longitude").value;
        BuildJSON();
        console.log("JSON Built.");
        wsConnection.send(compiledJSON);
        console.log("JSON Sent.");
        console.log("Settings Requested.");
        ToggleMeasurementUnits();

        wsConnection.send("RESET")
        setTimeout(function() {
            window.location.reload(true);
        }, 5000);;

    }
}

function BuildJSON() {
    jsonObj = {
        "Latitude": Latitude,
        "Longitude": Longitude,
        "Sensor_M_F": Sensor_M_F,
        "Sensor_Location": Sensor_Location,
        "Sensor_TimeZone": Sensor_TimeZone,
        "Sensor_Type": Sensor_Type,
        "Sensor_Offset": Sensor_Offset,
        "Sensor_MeasurementInterval": Sensor_MeasurementInterval,
        "WiFi_SSID": WiFi_SSID,
        "WiFi_Password": WiFi_Password,
        "Radio_OperationMode": Radio_OperationMode
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
    document.getElementById("WiFi_SSID").value = selectedAP[1];
    document.getElementById("WiFi_Password").value = "";
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
    CurrentTideValue = doc.CurrentTideValue;
    CurrentTideValue = Number.parseFloat(parseFloat(CurrentTideValue)).toFixed(2);
    CurrentTideTime = doc.CurrentTideTime;
    Sensor_M_F = doc.Sensor_M_F;
    Sensor_Location = doc.Sensor_Location;
    Sensor_TimeZone = doc.Sensor_TimeZone;
    Sensor_Type = doc.Sensor_Type;
    Sensor_Offset = doc.Sensor_Offset;
    Sensor_AveragingReadTime = doc.Sensor_AveragingReadTime;
    Sensor_MeasurementInterval = doc.Sensor_MeasurementInterval;
    WiFi_SSID = doc.WiFi_SSID;
    WiFi_Password = doc.WiFi_Password;
    Radio_OperationMode = doc.Radio_OperationMode;
    Radio_Activated = doc.Radio_Activated;
    WebUpload = doc.WebUpload;
    WebInterface = doc.WebInterface;
    Latitude = doc.Latitude
    Longitude = doc.Longitude
}

function LoadSettings() {
    document.getElementById("CurrentTideValue").innerHTML = CurrentTideValue;
    document.getElementById("CurrentTideTime").innerHTML = CurrentTideTime;
    document.getElementById("CurrentLocation").innerHTML = Sensor_Location;
    document.getElementById("Sensor_Location").value = Sensor_Location;
    document.getElementById("Sensor_TimeZone").value = Sensor_TimeZone;
    document.getElementById("M_F").value = Sensor_M_F;
    document.getElementById("Sensor_Type").value = Sensor_Type;
    document.getElementById("Sensor_Offset").value = Sensor_Offset;
    document.getElementById("Sensor_MeasurementInterval").value = Sensor_MeasurementInterval;
    document.getElementById("WiFi_SSID").value = WiFi_SSID;
    document.getElementById("WiFi_Password").value = WiFi_Password;
    document.getElementById("Radio_OperationMode").value = Radio_OperationMode;
    document.getElementById("Latitude").value = Latitude;
    document.getElementById("Longitude").value = Longitude;
    ToggleMeasurementUnits()
}

function ExportTideHistory() {
    wsConnection.send("DLH");
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
        setTimeout(function() {
            window.location.reload(true);
        }, 3000);;
    }
}

function RestartESP() {
    if (confirm("Resart the Device? Page will reload.")) {
        wsConnection.send("RESET")
        setTimeout(function() {
            window.location.reload(true);
        }, 2000);;
    }
}

function ShowImportLicense() {
    document.getElementById("LicenseNumber").style.display = "block";
    document.getElementById("FirmwareQuery").style.display = "block";
}

function CheckLicenceCode() {
    var pass = document.getElementById("LicenseCode").value;
    var res = String.fromCharCode(64);
    pass = String.fromCharCode(64) + document.getElementById("LicenseCode").value;
    wsConnection.send(pass);
}

function initMap() {
    var map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: Latitude, lng: Longitude },
        zoom: 15,
        mapTypeId: 'satellite',
    });
    var infoWindow = new google.maps.InfoWindow({
        content: '<img src=Tower.png height=30 width=20 >  <b>Current Tide: ' + CurrentTideValue + '</b>',
        height: 100
    });

    const marker = new google.maps.Marker({
        position: { lat: Latitude, lng: Longitude },
        map: map,
        scale: 0.5,
    });
    marker.addListener('click', function() {
        marker.content = 'Current Tide<br>' + CurrentTideValue;

        infoWindow.open(map, marker);
    });

}