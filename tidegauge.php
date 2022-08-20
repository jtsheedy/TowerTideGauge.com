<?php
require "includes/db_connect.php";
$DateOfReading = 0;
$tidedata = array();
$sn = isset($_GET['_serial']) ?  (int)$_GET['_serial'] : null;
$result = mysqli_query($mysqli, "SELECT * FROM `TideGauges` WHERE _serial = $sn ORDER BY `TideGauges`.`_time` DESC");
$num = 0;
while ($row = $result->fetch_assoc()) {
    array_push($tidedata, $row);
}

echo json_encode($tidedata);

$mysqli->close();
