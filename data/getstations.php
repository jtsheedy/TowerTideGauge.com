<?php
require "db_connect.php";

$result = mysqli_query($mysqli, "SELECT * FROM TideGauges group by `TideGauges`.`_serial` ORDER BY `TideGauges`.`_date` DESC"  );
$tidedata = array();
$stations = array();
$stationFound = false;
while ($row = $result->fetch_assoc()) {array_push($tidedata, $row);}
echo json_encode($tidedata);
exit();
$mysqli->close();
?>