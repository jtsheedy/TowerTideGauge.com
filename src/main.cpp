#include "main.h"

// Time Settings
const char *NTP_SERVER = "pool.ntp.org";
const int daylightOffset_sec = 3600;
struct tm timeinfo;
time_t now;
bool startup = true;
// Web Servers

// Global Variables
TaskHandle_t ReadSensorTask;

const char *ServerFirmwareVersion;
long LastReadTime;

char WiFi_AP_Password[64];
char WiFi_STA_SSID[64];
char WiFi_STA_Password[64];
uint16_t WiFi_tcpPort = 10232;
uint16_t WiFi_udpPort = 8881;
float CurrentTideValue;
const char *CurrentTideTime;
const char *CurrentTideString;
double Sensor_Latitude = 0;
double Sensor_Longitude = 0;
int Sensor_M_F;
char Sensor_Location[32];
char Sensor_Country[5];
int Sensor_TimeZone;
int Sensor_Type;
float Sensor_Offset = 0;
int Sensor_AveragingReadTime = 10; // Number of readings taken
int Sensor_MeasurementInterval;    // Time between Readings
uint32_t Output_Baud = 115200;
char FTP_Server[64] = "";
char FTP_User[64] = "";
char FTP_Pass[64] = "";
char FTP_Filename[] = "tides.csv";
float Radio_Destination;
bool wsClient[5];
double AveragingArray[9];
bool DataReadyToSend = false;
long destination; // destination to send to
char SerialNumber[15];
int LicenseActivator = 0;
bool upload = false;
unsigned long ota_progress_millis = 0;

AsyncWebServer wiFiServer(PORT);
WebSocketsServer ws = WebSocketsServer(WSSPORT);
AsyncUDP udp;
WiFiClient *wifiClients[MAX_CLIENTS] = {NULL};
ESP32_FTPClient ftp(FTP_Server, FTP_User, FTP_Pass);

// EspSoftwareSerial::UART Display_Serial(Display_Serial_RX, Display_Serial_TX);

void GetTidePredictions()
{
}

void PostToFTP()
{
  bool fileExsists = false;
  static char fileName[32];
  ftp.OpenConnection();
  ftp.InitFile("Type A");
  ftp.ChangeWorkDir("/");
  snprintf(fileName,
           sizeof(fileName),
           "/%02i-%02i-%02i.csv",
           (timeinfo.tm_year - 100),
           (timeinfo.tm_mon + 1),
           (timeinfo.tm_mday));
  ftp.AppendFile(fileName);
  ftp.Write(CurrentTideString);
  ftp.CloseFile();
  ftp.CloseConnection();
}

void PostToWebServer()
{

  if (WiFi.status() == WL_CONNECTED)
  {
    HTTPClient webclient;
    String postData =
        "_currenttidestring=" + (String)CurrentTideString;
    webclient.begin(POSTSERVER);
    webclient.addHeader("Content-Type", "application/x-www-form-urlencoded");
    int httpResponseCode = webclient.POST(postData); // Send the actual POST request
    if (httpResponseCode > 0)
    {
      String response = webclient.getString(); // Get the response to the request
      // printf("Success\n%i\n%s\n", httpResponseCode, response); // Print return code
    }
    else
    {
      // printf("");
      printf("Error on sending POST: %i\n", httpResponseCode);
    }
    webclient.end(); // Free resources
  }
}
void GetTime()
{
  static char ctt[85];
  configTime(Sensor_TimeZone, daylightOffset_sec, NTP_SERVER);
  delay(1000);
  if (!getLocalTime(&timeinfo))
  {
    printf("Failed to obtain time\n");
    return;
  }
  struct tm *timeinfo;
  time_t now;

  timeinfo = localtime(&now);

  char endTime[80];
  strftime(endTime, 80, "%Y-%m-%d %H:%M:%S", timeinfo);
  snprintf(ctt, sizeof(ctt), "%s", endTime);
  CurrentTideTime = ctt;
  // printf("Local Time: %s\n====================================================\n", CurrentTideTime);
}

void ResizeTideFile()
{
  float position = -1;
  int firstNewLine = -1;
  int lines = 0;
  char caracter;
  String received = "";
  File TideFile = SPIFFS.open(TIDE_FILE, FILE_READ);
  if (!TideFile)
  {
    printf("Error Opening Tide File\n");
    return;
  }
  else
  {
    while (TideFile.available())
    {
      position += 1;
      caracter = TideFile.read();
      received += caracter;
      if (caracter == '\n')
      {
        if (firstNewLine == -1)
        {
          firstNewLine = position;
        }
        lines += 1;
      }
    }
    TideFile.close();
    position = 0;
    received = "";
    delay(1000);
    if (lines > MAXTIDEREADINGS)
    {
      File TideFile = SPIFFS.open(TIDE_FILE, FILE_WRITE);
      if (!TideFile)
      {
        printf("Error Opening Tide File\n");
        return;
      }
      else
      {
        received = received.substring(received.indexOf('\n') + 1, received.length());
        TideFile.println(received);
        printf("==========================\nReceived: %s\n==========================");
      }
      TideFile.close();
    }
  }
}
void WriteTideFile()
{
  ResizeTideFile();
  File TideFile = SPIFFS.open(TIDE_FILE, FILE_APPEND);
  if (!TideFile)
  {
    printf("Error Opening Tide File");
    return;
  }
  else
  {
    TideFile.println(CurrentTideString);
  }
  TideFile.close();
}
void BuildTideString()
{
  static char cts[95];
  const char *unit = "m";
  if (Sensor_M_F == 1)
  {
    unit = "f";
  }
  snprintf(cts,
           sizeof(cts),
           "$TIDE,%s,%s,%s,%f,%f,%02i-%02i-%02i,%02i:%02i,%0.2f,%s\n",
           SerialNumber,
           Sensor_Country,
           Sensor_Location,
           Sensor_Latitude,
           Sensor_Longitude,
           (timeinfo.tm_year - 100),
           (timeinfo.tm_mon + 1),
           (timeinfo.tm_mday),
           (timeinfo.tm_hour),
           (timeinfo.tm_min),
           CurrentTideValue,
           unit);
  CurrentTideString = cts;
  printf("%s", CurrentTideString);
}

void DeleteTideFile()
{
  File TideFile = SPIFFS.open(TIDE_FILE, FILE_WRITE);
  if (TideFile.print(""))
  {
    printf("New Tide File Created.");
  }
  TideFile.close();
  CurrentTideValue = 0;
  CurrentTideTime = "";
  CurrentTideString = "";
}
void SetTideValue()
{
  if (Sensor_M_F == 1)
  {
    CurrentTideValue *= METER_TO_FEET_CONVERSION;
  }
  LastReadTime = time(&now);
  GetTime();
  BuildTideString();
  WriteTideFile();
  PostToFTP();
  DataReadyToSend = true;
}
void SendTideHistory()
{
  File file = SPIFFS.open(TIDE_FILE, FILE_READ);
  if (!file)
  {
    printf("Failed to load history.");
    return;
  }
  String DataToSend = "HIS|" + file.readString();
  file.close();
  ws.broadcastTXT(DataToSend);
}
void BroadcastTideData()
{
  char DataToSend[100];
  snprintf(DataToSend, sizeof(DataToSend), "%s", CurrentTideString);
  Output_TCP(DataToSend);
  udp.broadcast(CurrentTideString);
  snprintf(DataToSend, sizeof(DataToSend), "CTV|%s", CurrentTideString);
  SendTideHistory();
  ws.broadcastTXT(DataToSend);
}
void ReadMPM4700()
{
  double CalculatedTideValue = 0;
  long NumberOfReadings = 0;
  printf("Reading MPM4700");
  while (NumberOfReadings < Sensor_AveragingReadTime)
  {
    digitalWrite(POWERLED, HIGH); // turn the LED on (HIGH is the voltage level)
    digitalWrite(Sensor_Serial_DE, HIGH);
    Sensor_Serial.write(MPM4700OUTPUT);
    Sensor_Serial.flush();
    digitalWrite(Sensor_Serial_DE, LOW);
    digitalWrite(POWERLED, LOW); // turn the LED off by making the voltage LOW
    delay(1000);
    if (Sensor_Serial.available() >= 1)
    {
      String data = Sensor_Serial.readString();
      String TReading = data.substring(3, 10);
      char charArray[TReading.length() + 1];
      strcpy(charArray, TReading.c_str());
      AveragingArray[NumberOfReadings] = atof(charArray);
      NumberOfReadings += 1;
    }
  }
  for (int i = 0; i < NumberOfReadings - 1; i++)
  {
    CalculatedTideValue += AveragingArray[i];
  }
  CalculatedTideValue /= NumberOfReadings;
  CalculatedTideValue = Sensor_Offset - CalculatedTideValue;

  float sanityCheck = (CurrentTideValue - CalculatedTideValue);
  if (sanityCheck >= (CurrentTideValue - 1) || sanityCheck >= (CurrentTideValue + 1) || CurrentTideValue == Sensor_Offset)

    CurrentTideValue = CalculatedTideValue;
  SetTideValue();
}
void ReadRD92()
{
  uint8_t bytArray[] = {1, 3, 0, 0, 0, 2, 196, 11};
  digitalWrite(POWERLED, HIGH); // turn the LED on (HIGH is the voltage level)
  digitalWrite(Sensor_Serial_DE, HIGH);
  delay(1);
  Sensor_Serial.write(bytArray, 8);
  Sensor_Serial.flush();
  digitalWrite(Sensor_Serial_DE, LOW);
  digitalWrite(POWERLED, LOW); // turn the LED off by making the voltage LOW

  uint32_t timeout = millis();
  while (Sensor_Serial.available() < 9)
  {
    if ((millis() - timeout) > 1000)
    {
      break;
    }
  }
  int available = Sensor_Serial.available();
  if (available == 9)
  {
    // printf("Reading RD92 Sensor\nBytes Available %i\n", available);
    uint8_t bytArray[available];
    for (size_t i = 0; i < available; i++)
    {
      bytArray[i] = Sensor_Serial.read(); /* code */
      // printf("%03i,", bytArray[i]);
    }
    // printf("\n");

    // Sensor_Serial.read(bytArray, available);
    uint16_t n = (bytArray[3] << 8) | bytArray[4];
    float TideReading = n;
    TideReading /= 100;
    TideReading = Sensor_Offset - TideReading;
    // printf("Current Tide Level: %f\n", CurrentTideValue);
    if (startup = false)
    {
      float sanityCheck = (TideReading - CurrentTideValue);
      if (TideReading < -2 || sanityCheck >= (CurrentTideValue + 1) || sanityCheck <= (CurrentTideValue - 1) || CurrentTideValue == Sensor_Offset)
      {
        ESP.restart();
      }
    }
    CurrentTideValue = TideReading;
    SetTideValue();
    startup = false;
  }
  else
  {
    printf("Unable To Read RD92 Sensor\n");
    ESP.restart();
    DataReadyToSend = false;
  }
}
void ReadSensorLoop(void *parameter)
{
  while (true)
  {
    long timeNow = time(&now);
    long diff = (timeNow - LastReadTime);

    if (diff >= Sensor_MeasurementInterval)
    {
      // printf("Time Info:%i - %i = %i\n", LastReadTime, timeNow, diff);
      switch (Sensor_Type)
      {
      case 0: // MPM4700
        ReadMPM4700();
        break;
      case 1: // RD92 Radar Level Sensor
        ReadRD92();
        break;
      default:
        break;
      }
      // printf("Time: %i\tLast Read Time: %i\tTime Since Last Read: %i\n", timeNow, LastReadTime, diff);
    }
    if (DataReadyToSend == true)
    {
      BroadcastTideData();
      PostToWebServer();
    }
    DataReadyToSend = false;
  }
}

void GetFWVersion(uint8_t num)
{
  HTTPClient http;
  http.begin(UPDATE_JSON_URL);
  int httpCode = http.GET();
  if (httpCode > 0)
  {
    // HTTP header has been send and Server response header has been handled
    // printf("[HTTP] GET... code: %d\n", httpCode);

    // file found at server
    if (httpCode == HTTP_CODE_OK)
    {
      String payload = http.getString();
      payload = "ServerFirmware|" + payload;
      ws.broadcastTXT(payload);
    }
  }
  else
  {
    printf("[HTTP] GET... failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
void ScanForNetwork(uint8_t num)
{
  printf("Scanning for Networks");
  int n = WiFi.scanNetworks();
  String FoundNetworks = "Networks|";
  printf("Scan done");
  if (n == 0)
  {
    printf("No networks found");
    ws.sendTXT(num, "Networks|No Networks Found");
  }
  else
  {
    printf("Networks found");
    for (int i = 0; i < n; ++i)
    {
      // Print SSID and RSSI for each network found
      if (i != 0)
      {
        FoundNetworks += ("*");
      }
      FoundNetworks += (i + 1);
      FoundNetworks += (",");
      FoundNetworks += (WiFi.SSID(i));
      FoundNetworks += (",");
      FoundNetworks += (WiFi.RSSI(i));
      FoundNetworks += (",");
      switch (WiFi.encryptionType(i))
      {
      case WIFI_CIPHER_TYPE_NONE:
        FoundNetworks += "NONE";
        break;
      case WIFI_CIPHER_TYPE_WEP40:
        FoundNetworks += "WEP40";
        break;
      case WIFI_CIPHER_TYPE_WEP104:
        FoundNetworks += "WEP104";
        break;
      case WIFI_CIPHER_TYPE_TKIP:
        FoundNetworks += "TKIP";
        break;
      case WIFI_CIPHER_TYPE_CCMP:
        FoundNetworks += "CCMP";
        break;
      case WIFI_CIPHER_TYPE_TKIP_CCMP:
        FoundNetworks += "TKIP/CCMP";
        break;
      case WIFI_CIPHER_TYPE_UNKNOWN:
        FoundNetworks += "UNKNOWN";
        break;
      }
    }
    ws.sendTXT(num, FoundNetworks);
  }
  printf("");
}

void SaveSettings()
{
  File file = SPIFFS.open("/config.json", FILE_WRITE);
  if (!file)
  {
    printf("Failed to load settings.");
    return;
  }
  JsonDocument json;

  json["Sensor_Country"] = Sensor_Country;
  json["Sensor_Location"] = Sensor_Location;
  json["Sensor_TimeZone"] = Sensor_TimeZone;
  json["Sensor_Type"] = Sensor_Type;
  json["Sensor_Offset"] = Sensor_Offset;
  json["Sensor_M_F"] = Sensor_M_F;
  json["Sensor_MeasurementInterval"] = Sensor_MeasurementInterval;
  json["Sensor_Latitude"] = Sensor_Latitude;
  json["Sensor_Longitude"] = Sensor_Longitude;
  json["WiFi_STA_SSID"] = WiFi_STA_SSID;
  json["WiFi_STA_Password"] = WiFi_STA_Password;
  json["WiFi_AP_Password"] = WiFi_AP_Password;
  json["WiFi_tcpPort"] = WiFi_tcpPort;
  json["WiFi_udpPort"] = WiFi_udpPort;
  json["Output_Baud"] = Output_Baud;
  json["FTP_Server"] = FTP_Server;
  json["FTP_User"] = FTP_User;
  json["FTP_Pass"] = FTP_Pass;

  serializeJsonPretty(json, file);
  file.close();
}
void Load_Settings()
{
  File file = SPIFFS.open("/config.json", FILE_READ);
  if (!file)
  {

    printf("Failed to load settings. Loading Defaults\n");
    Sensor_TimeZone = -6;
    Sensor_M_F = 0;
    Sensor_Type = 1;
    Sensor_Offset = 0;
    Sensor_AveragingReadTime = 10;
    Sensor_MeasurementInterval = 10;
    Sensor_Latitude = 0;
    Sensor_Longitude = 0;
    snprintf(WiFi_STA_SSID, sizeof(WiFi_STA_SSID), "Tower Tide");
    snprintf(WiFi_STA_Password, sizeof(WiFi_STA_Password), "TowerAdmin78");
    snprintf(WiFi_AP_Password, sizeof(WiFi_AP_Password), "TowerAdmin78");
    WiFi_tcpPort = 10232;
    WiFi_udpPort = 8881;
    Output_Baud = 115200;
    snprintf(FTP_Server, sizeof(FTP_Server), "");
    snprintf(FTP_User, sizeof(FTP_User), "");
    snprintf(FTP_Pass, sizeof(FTP_Pass), "");
  }
  else
  {
    JsonDocument json;
    String content = file.readString();
    printf("%s\n", content);
    DeserializationError error = deserializeJson(json, content);
    if (error)
    {
      printf("Failed to read file, using default configuration\n");
      return;
    }
    file.close();
    strcpy(WiFi_STA_SSID, json["WiFi_STA_SSID"] | "");
    strcpy(WiFi_STA_Password, json["WiFi_STA_Password"] | "");
    strcpy(WiFi_AP_Password, json["WiFi_AP_Password"] | "");
    WiFi_tcpPort = json["WiFi_tcpPort"];
    WiFi_udpPort = json["WiFi_udpPort"];
    Sensor_Latitude = json["Sensor_Latitude"];
    Sensor_Longitude = json["Sensor_Longitude"];
    strcpy(Sensor_Country, json["Sensor_Country"] | "");
    strcpy(Sensor_Location, json["Sensor_Location"] | "");
    Sensor_TimeZone = json["Sensor_TimeZone"];
    Sensor_Type = json["Sensor_Type"];
    Sensor_Offset = json["Sensor_Offset"];
    Sensor_M_F = json["Sensor_M_F"];
    Sensor_MeasurementInterval = json["Sensor_MeasurementInterval"];
    Output_Baud = json["Output_Baud"];
    strcpy(FTP_Server, json["FTP_Server"]);
    strcpy(FTP_User, json["FTP_User"]);
    strcpy(FTP_Pass, json["FTP_Pass"]);
  }
  printf("Settings Loaded\n");

  file.close();
}

void onWebSocketEvent(uint8_t num, /* Client Number*/ WStype_t type, /* Type Recieved*/ uint8_t *payload, /* Data recieved in bytes*/ size_t length) /* Size of data*/
{
  switch (type)
  {
  case WStype_TEXT:
  {
    // printf("Data Recieved: %s\n", (char *)payload);

    if (strcmp((char *)payload, "SETTINGS") == 0)
    {
      File file = SPIFFS.open("/config.json", FILE_READ);
      if (!file)
      {
        printf("Failed to load settings.");
        return;
      }
      String json;
      json = "SETTINGS|";
      json += file.readString();
      // printf("%s", json);
      ws.sendTXT(num, json);
    }
    else if (payload[0] == (123))
    {
      printf("Saving Config\n");
      delay(1000);
      JsonDocument json;
      char JSONString[length + 5];
      memcpy(JSONString, (char *)payload, length);
      printf("JSON Copied\n");
      DeserializationError err = deserializeJson(json, JSONString);
      if (err)
      {
        printf("Error Deserializing JSON.\n%s\n%s", err.c_str(), (char *)payload);
        return;
      }
      File file = SPIFFS.open("/config.json", FILE_WRITE);
      serializeJsonPretty(json, file);
      file.close();
      printf("Config Saved to file\n");
      return;
    }
    else if (payload[0] == (35)) // #
    {
      // printf("Password Requested\n");
      if (strcmp((char *)payload, ADMINPASSWORD) == 0)
      {
        ws.sendTXT(num, "PWD|TRUE");
        // printf("Correct Password\n");
      }
      else
      {
        ws.sendTXT(num, "PWD|FALSE");
        // printf("Incorrect Password");
      }
      return;
    }
    else if (strcmp((char *)payload, "RESET") == 0)
    {
      ESP.restart();
    }
    else if (strcmp((char *)payload, "HIS") == 0)
    {
      SendTideHistory();
      delay(1000);
    }
    else if (strcmp((char *)payload, "DTH") == 0)
    {
      DeleteTideFile();
    }
    else if (strcmp((char *)payload, "SWN") == 0)
    {
      ScanForNetwork(num);
      // printf("Networks Sent");
      // printf();
    }
    else if (strcmp((char *)payload, "CTV") == 0)
    {
      char DataToSend[100];
      snprintf(DataToSend, sizeof(DataToSend), "CTV|%s", CurrentTideString);
      ws.sendTXT(num, DataToSend);
    }
    else if (strcmp((char *)payload, "SN") == 0)
    {
      char DataToSend[100];
      snprintf(DataToSend, sizeof(DataToSend), "SN|%s", SerialNumber);
      ws.sendTXT(num, DataToSend);
    }
    else if (strcmp((char *)payload, "IP") == 0)
    {
      IPAddress APIP = WiFi.softAPIP();
      IPAddress StationIP = WiFi.localIP();

      char DataToSend[100];
      char ipInfo[50];
      String IPInfo = "IP|" +
                      String(APIP[0]) + "." +
                      String(APIP[1]) + "." +
                      String(APIP[2]) + "." +
                      String(APIP[3]) + "," +
                      String(StationIP[0]) + "." +
                      String(StationIP[1]) + "." +
                      String(StationIP[2]) + "." +
                      String(StationIP[3]);

      ws.sendTXT(num, IPInfo);
    }
    else
    {
      printf("Message not recognized\n%s\n", (char *)payload);
    }
  }
  // For everything else: do nothing
  case WStype_DISCONNECTED:
  {
    // printf("[%u] Disconnected!\n", num);
    wsClient[num] = false;
    break;
  }
  case WStype_CONNECTED:
  {
    IPAddress ip = ws.remoteIP(num);
    wsClient[num] = true;
    // printf("Connection from [%u] %s", num, ip.toString());
    ws.broadcastTXT(CurrentTideString);
    break;
  }
  case WStype_BIN:
  case WStype_ERROR:
  case WStype_FRAGMENT_TEXT_START:
  case WStype_FRAGMENT_BIN_START:
  case WStype_FRAGMENT:
  case WStype_FRAGMENT_FIN:
  default:
    break;
  }
}

void onOTAStart()
{
  upload = true;
  // Log when OTA has started
  printf("OTA update started!\n");
  // <Add your own code here>
}
void onOTAProgress(size_t current, size_t final)
{
  // Log every 1 second
  if (millis() - ota_progress_millis > 1000)
  {
    ota_progress_millis = millis();
    printf("OTA Progress Current: %u bytes, Final: %u bytes\n", current, final);
  }
}
void onOTAEnd(bool success)
{
  upload = false;
  // Log when OTA has finished
  if (success)
  {
    printf("OTA update finished successfully!\n");
  }
  else
  {
    printf("There was an error during OTA update!\n");
  }
  // <Add your own code here>
}
void Setup_mDNS()
{
  if (!MDNS.begin("TowerTideGauge"))
  {
    printf("Error setting up MDNS responder!\n====================================================\n");
    return;
  }
  else
  {
    MDNS.addService("http", "tcp", 80);
    printf("mDNS TowerTideGauge.local Started.\n====================================================\n");
  }
}
void Setup_UDP()
{
  if (udp.listen(WiFi_udpPort))
  {
    IPAddress _ip = WiFi.localIP();
    printf("UDP Active on Address: %i.%i.%i.%i: port %i.\n====================================================\n", _ip[0], _ip[1], _ip[2], _ip[3], WiFi_udpPort);
    udp.onPacket([](AsyncUDPPacket packet)
                 { printf("%s\n", packet.data()); });
  }
}
void Setup_WebPage()
{
  ElegantOTA.begin(&wiFiServer); // Start ElegantOTA
  // ElegantOTA callbacks
  ElegantOTA.setAutoReboot(true);
  ElegantOTA.onStart(onOTAStart);
  ElegantOTA.onProgress(onOTAProgress);
  ElegantOTA.onEnd(onOTAEnd);

  wiFiServer.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/index.html", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/index.css", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/index.css", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/index.js", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/tides.csv", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/tides.csv", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/config.json", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/config.json", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/Chart.min.js", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/Chart.min.js", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/jquery-3.5.1.min.js", HTTP_GET, [](AsyncWebServerRequest *request)
                {AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/jquery-3.5.1.min.js", String(), false);response->addHeader("Access-Control-Allow-Origin", "*");request->send(response); });
  wiFiServer.on("/favicon.ico", HTTP_GET, [](AsyncWebServerRequest *request)
                { request->send(SPIFFS, "/favicon.ico", "image/png"); });
  wiFiServer.on("/Tower.png", HTTP_GET, [](AsyncWebServerRequest *request)
                { request->send(SPIFFS, "/Tower.png", "image/png"); });
  wiFiServer.on("/level.png", HTTP_GET, [](AsyncWebServerRequest *request)
                { request->send(SPIFFS, "/level.png", "image/png"); });
  wiFiServer.on("/wifi.png", HTTP_GET, [](AsyncWebServerRequest *request)
                { request->send(SPIFFS, "/wifi.png", "image/png"); });
  wiFiServer.on("/ocean.jpg", HTTP_GET, [](AsyncWebServerRequest *request)
                { request->send(SPIFFS, "/ocean.jpg", "image/jpg"); });
  wiFiServer.onNotFound([](AsyncWebServerRequest *request)
                        { request->send(404); });
  ws.begin();
  ws.onEvent(onWebSocketEvent);

  wiFiServer.serveStatic("/fs", SPIFFS, "/");

  wiFiServer.begin();
  printf("OTA Firmware Updates Started\n====================================================\n");
  printf("Web Server Started\n====================================================\n");
  printf("WebSocket Server Started.\n====================================================\n");
}
void Setup_AccessPoint()
{
  char APID[64];
  snprintf(APID, sizeof(APID), "Tower Tide Gauge %s", SerialNumber);
  WiFi.softAP(APID, WiFi_AP_Password);
  delay(250);

  printf("WiFi Access Point Created.\nSSID: %s\nPassword: %s\nAP IP address: %s\n", APID, WiFi_AP_Password, WiFi.softAPIP().toString());
  printf("====================================================\n");
}
void Setup_Station()
{
  WiFi.mode(WIFI_AP_STA);

  if (WiFi_STA_SSID != "")
  {
    printf("Connecting to WiFi:%s\n", WiFi_STA_SSID);
    printf("Using Password:%s\n", WiFi_STA_Password);
    WiFi.begin(WiFi_STA_SSID, WiFi_STA_Password);
    byte count = 0;
    while (WiFi.status() != WL_CONNECTED && count < 60)
    {
      printf(".");
      count++;
      delay(1000);
    }
    printf("\n");
    if (WiFi.status() == WL_CONNECTED)
    {
      printf("Connected as WiFi Client to: %s\nIP address:  %s\n", WiFi_STA_SSID, WiFi.localIP().toString());
    }
    else
    {
      printf("\nWifi Connection...Failed\n");
      // ESP.restart();
    }
  }
  printf("====================================================\n");
}
void Setup_DeviceID()
{
  uint8_t WiFi_MAC[6];

  WiFi.macAddress(WiFi_MAC);
  sprintf(SerialNumber, "%01u%01u", WiFi_MAC[2], WiFi_MAC[5]);
  printf("Serial Number = %i\n====================================================\n", SerialNumber);
}
void Setup_SPIFFS()
{
  if (!SPIFFS.begin(true))
  {
    printf("An Error has occured while Mounting SPIFFS\n");
    return;
  }
  else
  {
    long total = SPIFFS.totalBytes();
    long used = SPIFFS.usedBytes();
    long free = (total - used);

    printf("SPIFFS mounted.\nFree Space: %i bytes.\n====================================================\n", free);
    /*File root = SPIFFS.open("/");
    File file = root.openNextFile();
    while (file)
    {
      printf("%s\n", file.name());
      file = root.openNextFile();
    }
    printf("====================================================\n");
    */
  }
}
void Setup_Serial()
{
  Serial.begin(115200);
  printf("Serial_Debug Started\n");

  pinMode(Sensor_Serial_TX, OUTPUT);
  pinMode(Sensor_Serial_RX, INPUT);
  Sensor_Serial.begin(9600, SERIAL_8N1, Sensor_Serial_RX, Sensor_Serial_TX);
  printf("Sensor_Serial Started\n");

  // pinMode(Display_Serial_TX, OUTPUT);
  // pinMode(Display_Serial_RX, INPUT);
  //  Display_Serial.begin(9600);
  // printf("Display_Serial Started\n");
  // Display_Serial.printf("Display_Serial Started\n");
}
void PinTaskToCore()
{
  xTaskCreatePinnedToCore(
      ReadSensorLoop,   /* Function to implement the task */
      "ReadSensorTask", /* Name of the task */
      10000,            /* Stack size in words */
      NULL,             /* Task input parameter */
      0,                /* Priority of the task */
      &ReadSensorTask,  /* Task handle. */
      1);               /* Core where the task should run */
}

void setup()
{
  delay(2000);
  pinMode(Sensor_Serial_DE, OUTPUT);
  pinMode(POWERLED, OUTPUT);
  digitalWrite(Sensor_Serial_DE, LOW); // enable 485 recieve by making the voltage LOW
  digitalWrite(POWERLED, HIGH);        // turn the LED off by making the voltage LOW
  Setup_Serial();
  Setup_SPIFFS();
  Load_Settings();
  Setup_DeviceID();
  Setup_Station();
  Setup_AccessPoint();
  Setup_WebPage();
  Setup_TCPServer();
  Setup_UDP();
  Setup_mDNS();
  GetTime();

  PinTaskToCore();
}

void loop()
{
  vTaskDelay(100);
  ws.loop();
  Find_TCPClient();
}