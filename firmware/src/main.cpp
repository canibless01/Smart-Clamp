#include <Arduino.h>
#include "core.hpp"
#include "runtime.hpp"
#include "crypto.hpp"
#include "hardware_config.hpp"
#include "cloud_agent.hpp"
#include "prepaid_policy.hpp"
#ifndef DEVICE_ROLE
#error DEVICE_ROLE must be defined by a device profile
#endif
// Sensing/actuation remain electrically inert until qualified adapters are fitted.
// A private LittleFS provisioning image enables real TLS commissioning heartbeats.
static constexpr auto role = static_cast<sc::Role>(DEVICE_ROLE);
static constexpr auto caps = sc::capabilities(role);
void sensorTask(void*) {
 sc::RelayPolicy relay;
 for(;;) {
  // Uncommissioned policy always refuses actuation. No fabricated readings sent upstream.
  const auto result=relay.request(true,false,false);
  if(result.allowed) abort();
  vTaskDelay(pdMS_TO_TICKS(100));
 }
}
void networkTask(void*) {
 static const char* names[]={"transformer","pole_gateway","pole_device","house_full","building_hub","ir_reader"};
 sc::CloudAgent agent;
 const bool provisioned=agent.begin(names[DEVICE_ROLE]);
 Serial.printf("{\"provisioned_transport\":%s,\"hardware_qualified\":false}\n",provisioned?"true":"false");
 for(;;) {
  if(provisioned){agent.tick();vTaskDelay(pdMS_TO_TICKS(100));continue;}
  Serial.printf("{\"protocol\":\"bench-0\",\"role\":%d,\"channels\":%u,\"gsm_required\":%s,\"commissioned\":false,\"measurement\":null}\n",
   DEVICE_ROLE,caps.currentChannels,caps.gsm?"true":"false");
  vTaskDelay(pdMS_TO_TICKS(5000));
 }
}
void setup(){
 Serial.begin(115200);
 if(xTaskCreatePinnedToCore(sensorTask,"safety",4096,nullptr,3,nullptr,1)!=pdPASS)abort();
 if(xTaskCreatePinnedToCore(networkTask,"network",16384,nullptr,1,nullptr,0)!=pdPASS)abort();
}
void loop(){vTaskDelay(pdMS_TO_TICKS(1000));}
