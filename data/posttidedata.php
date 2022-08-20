<?php
$Date = date("d/m/Y");
$Time = date("H:i:s");
$Serial = $_POST["Serial"];
$Location = $_POST["Location"];
$Latitude = number_format($_POST["Latitude"], 7);
$Longitude = number_format($_POST["Longitude"], 7);
$DateTime = $_POST["DateTime"];
$Value = $_POST["Value"];
$Units = $_POST["Units"];

require "../includes/db_connect.php";

$sql = "INSERT INTO TideGauges (_serial, _tide,  _units, _lat, _lon, _loc)
VALUES ('$Serial', '$Value', '$Units','$Latitude', '$Longitude', '$Location')";

if ($mysqli->query($sql) === TRUE) {
    //echo "New record created successfully";
} else {
    echo "Error: " . $sql . " " . $mysqli->error;
}

$mysqli->close();

?>