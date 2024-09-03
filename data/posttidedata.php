<?php
require "db_connect.php";
$data = $_POST["_currenttidestring"];

$stationInfo = explode(",", $data);
$_serial = $stationInfo[1];
$_country = $stationInfo[2];
$_loc = $stationInfo[3];
$_lat = $stationInfo[4];
$_lon = $stationInfo[5];
$_date = $stationInfo[6];
$_time = $stationInfo[7];
$_tide = $stationInfo[8];
$_units = $stationInfo[9];

$sql = "INSERT INTO TideGauges (_serial,_country,_loc,_lat,_lon,_date,_time,_tide,_units)
VALUES ('$_serial','$_country','$_loc','$_lat','$_lon','$_date','$_time','$_tide','$_units')";

if ($mysqli->query($sql) === TRUE) {
    echo "OK";
} else {
    echo "Error: " . $sql . " " . $mysqli->error;
}
$mysqli->close();
