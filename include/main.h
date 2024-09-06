#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ElegantOTA.h>
#include <AsyncTCP.h>
#include <AsyncUDP.h>
#include <WebSocketsServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <SoftwareSerial.h>
#include <time.h>
#include <ESP32_FTPClient.h>
#include "TCPServer.h"

#define METER_TO_FEET_CONVERSION 3.28084
#define Sensor_Serial Serial1
#define Display_Serial Serial2


#define POWERLED 3

#define Sensor_Serial_DE 5
#define Sensor_Serial_TX 6
#define Sensor_Serial_RX 7

#define Display_Serial_RX 0
#define Display_Serial_TX 1

#define PORT 80
#define WSSPORT 81


#define POSTSERVER "http://www.TowerTideGauge.com/data/posttidedata.php"

#define ADMINPASSWORD "#TowerAdmin78"

#define UPDATE_JSON_URL "http://www.TowerSoftwareLtd.com/versions/TideGauge_FW_Version.json"

#define MDNS_NAME "TowerTideGauge.local"

#define TIDE_FILE "/tides.csv"
#define MPM4700OUTPUT "$00RP230\r"
#define RADAROUTPUT
#define MAXTIDEREADINGS 500

#endif