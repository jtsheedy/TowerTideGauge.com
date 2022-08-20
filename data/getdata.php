<?php
$DateOfReading = 0;
require "../includes/db_connect.php";
$result = mysqli_query($mysqli, "SELECT * FROM TideGauges ORDER BY TideGauges._time DESC");
$tidedata = array();
$stations = array();
$stationFound = false;
while ($row = $result->fetch_assoc()) {array_push($tidedata, $row);}
echo json_encode($tidedata);
exit();
$mysqli->close();
