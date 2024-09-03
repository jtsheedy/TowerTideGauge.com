<?php
require "db_connect.php";
$_serial = $_POST["_serial"];
$DateOfReading = 0;
$tidedata = array();
$sn = isset($_GET['_serial']) ?  (int)$_GET['_serial'] : null;
$result = mysqli_query($mysqli, "SELECT * FROM `TideGauges` WHERE _serial = $sn ORDER BY `TideGauges`.`_id` DESC");

while ($row = $result->fetch_assoc()) {
    array_push($tidedata, $row);
}

echo json_encode($tidedata);

$mysqli->close();
