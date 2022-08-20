<?php
$servername = "localhost";
$username = "xyj0hinzxop8";//"towertide"//"root";//
$password = "R3b3cc@2010";//"TowerAdmin78"//"";//
$dbName = "Tower_Tide_Gauge";
$mysqli = new mysqli($servername, $username, $password, $dbName);
if ($mysqli->connect_errno) {
    die("Error in Connection");
    echo "Failed to connect to MySQL: ({$mysqli->connect_errno}) {$mysqli->connect_error}";
}
//echo $mysqli->host_info;
?>