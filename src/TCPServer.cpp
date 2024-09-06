#include "main.h"

WiFiServer wifiServer(10232, MAX_CLIENTS);
extern WiFiClient *wifiClients[];

extern uint16_t WiFi_tcpUpdate;
extern uint16_t WiFi_tcpPort;
extern uint16_t Output_Speed;
extern uint32_t count;
extern uint32_t lastOutputTime;

extern char Output_String[];
extern char CountOutput[];
uint32_t LastOutputTime;
uint8_t connectedClients = 0;

bool serverRunning = false;

void Kill_TCPServer()
{
    if (serverRunning)
    {
        printf("Stopping TCP server\n");

        for (uint8_t i = 0; i < MAX_CLIENTS; i++)
        { // Force all clients to disconnect
            if ((wifiClients[i] != NULL) && (wifiClients[i]->connected()))
            {
                wifiClients[i]->stop();
            }
        }
        wifiServer.stop();
        serverRunning = false;
    }
}
void Find_TCPClient()
{
    WiFiClient TCPclient = wifiServer.available();
    uint32_t tick = Output_Speed;

    if (TCPclient)
    {
        // We've got a new client, find an empty client
        for (uint8_t i = 0; i < MAX_CLIENTS; i++)
        {
            if (wifiClients[i] == NULL)
            {
                // We've got an empty client

                //printf("New client from %s, stored in position %d\r\n", TCPclient.remoteIP().toString().c_str(), i);
                connectedClients++;
                wifiClients[i] = new WiFiClient(TCPclient);
                break;
            }
            if (i == 6)
            {
                printf("Client rejected, not enough sockets\n");
            }
        }
    }
}
void Setup_TCPServer()
{
    if (!serverRunning)
    {
        wifiServer.begin(WiFi_tcpPort);
        serverRunning = true;
        printf("IP Output Started On Device.\n%s:%d\n", WiFi.softAPIP().toString(), WiFi_tcpPort);
        if (WiFi.localIP().toString() != "0.0.0.0")
        {
            printf("IP Output Started On Local Network\n%s:%d\n", WiFi.localIP().toString(), WiFi_tcpPort);
        }
        printf("==========================\n");
    }
}
void Output_TCP(char *Output_String)
{
    for (uint8_t i = 0; i < MAX_CLIENTS; i++)
    {
        if (wifiClients[i] != NULL)
        {
            if (!wifiClients[i]->connected())
            {
                // If the client has disconnected
                //printf("Client %d disconnected\n", i);
                wifiClients[i] = NULL;
                connectedClients--;
            }
            else
            {
                wifiClients[i]->write(Output_String);
                wifiClients[i]->write("\r\n");
            }
        }
    }
    return;
}
