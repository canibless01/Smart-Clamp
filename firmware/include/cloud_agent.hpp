#pragma once
#ifdef ARDUINO
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <Update.h>
#include <esp_ota_ops.h>
#include <esp_timer.h>
#include <sys/time.h>
#include <vector>
#include <algorithm>
#include "wire.hpp"
namespace sc {
// Real commissioning transport. No sensor values or relay outcomes are synthesized.
// Wi-Fi is for controlled bring-up, not a replacement for the specified GSM/local links.
class CloudAgent {
 DynamicJsonDocument cfg_{10000};Preferences state_;
 std::array<uint8_t,32> telemetry_{},command_{};
 std::string id_,origin_,ca_,boot_,role_;unsigned epoch_=0,config_=0;uint64_t sequence_=0;
 bool ready_=false,trusted_=false;uint64_t anchorMs_=0,anchorUptime_=0;uint32_t lastPoll_=0,lastBeat_=0;
 uint64_t uptime()const{return static_cast<uint64_t>(esp_timer_get_time()/1000);}
 uint64_t utc()const{return trusted_?anchorMs_+uptime()-anchorUptime_:0;}
 bool writeAtomic(const String& path,const std::string& bytes){
  if(LittleFS.exists(path))return true; // Immutable retries, not replacement.
  const String tmp=path+".tmp";File f=LittleFS.open(tmp,"w");if(!f)return false;
  bool ok=f.write(reinterpret_cast<const uint8_t*>(bytes.data()),bytes.size())==bytes.size();f.flush();f.close();
  return ok&&LittleFS.rename(tmp,path);
 }
 void identity(JsonDocument& p,const char* kind){
  p["kind"]=kind;p["device_id"]=id_;p["key_epoch"]=epoch_;p["config_epoch"]=config_;
  p["boot_id"]=boot_;p["seq"]=++sequence_;p["uptime_ms"]=uptime();
  if(trusted_)p["occurred_at_ms"]=utc();else p["occurred_at_ms"]=nullptr;
  p["clock_quality"]=trusted_?"trusted":"unknown";
 }
 bool enqueue(JsonDocument& p,const String& name){
  // Reserve a bounded journal. Full means no silent eviction or invented cloud ACK.
  File dir=LittleFS.open("/queue");unsigned count=0;for(File f=dir.openNextFile();f;f=dir.openNextFile())if(!f.isDirectory())++count;
  if(count>=128 || LittleFS.totalBytes()-LittleFS.usedBytes()<32768)return false;
  return writeAtomic("/queue/"+name+".json",signJson(p.as<JsonVariantConst>(),telemetry_,id_,epoch_));
 }
 int request(const char* path,const std::string& body,std::string& response){
  WiFiClientSecure tls;tls.setCACert(ca_.c_str());HTTPClient http;
  http.setConnectTimeout(5000);http.setTimeout(10000);http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  if(!http.begin(tls,(origin_+"/api/v1"+path).c_str()))return -1;
  http.addHeader("Content-Type","application/json");int code=http.POST(String(body.c_str()));
  // Every normal JSON response is bounded; binary download has a separate streaming path.
  if(code>0&&http.getSize()>=0&&http.getSize()<=32768){response=http.getString().c_str();}
  http.end();return code;
 }
 bool flushFile(const String& path){
  File f=LittleFS.open(path,"r");if(!f)return false;
  std::string body=f.readString().c_str();f.close();DynamicJsonDocument env(16000),p(10000),ack(4096);
  if(deserializeJson(env,body)||!verifyJson(env.as<JsonVariantConst>(),telemetry_,id_,epoch_,p))return false;
  const std::string kind=p["kind"].as<std::string>();const char* endpoint=kind=="command_receipt"?"/device/receipts":kind=="firmware_receipt"?"/device/firmware/receipts":"/device/events";
  std::string reply;if(request(endpoint,body,reply)!=200||deserializeJson(ack,reply))return false;
  const auto payload=canonicalJson(p.as<JsonVariantConst>());
  if(ack["committed"].as<bool>()&&ack["device_id"].as<std::string>()==id_&&ack["key_epoch"].as<unsigned>()==epoch_&&ack["boot_id"].as<std::string>()==p["boot_id"].as<std::string>()&&ack["seq"].as<uint64_t>()==p["seq"].as<uint64_t>()&&ack["payload_sha256"].as<std::string>()==sha256(payload))return LittleFS.remove(path);
  return false;
 }
 void flushOne(){
  File dir=LittleFS.open("/queue");
  for(File f=dir.openNextFile();f;f=dir.openNextFile()){
   String path=f.path();bool valid=!f.isDirectory()&&path.endsWith(".json");f.close();if(valid){flushFile(path);return;}
  }
 }
 bool receipt(const char* target,const char* result,const char* reason,JsonVariantConst manifest){
  DynamicJsonDocument p(4096);identity(p,"firmware_receipt");p["target_id"]=target;p["result"]=result;p["reason_code"]=reason;
  p["sha256"]=manifest["sha256"];p["secure_version"]=manifest["secure_version"];
  if(std::string(result)=="boot_confirmed")p["health_ok"]=true;
  return enqueue(p,String("f-")+target+"-"+result);
 }
 void firmware(JsonVariantConst env,uint64_t pollSequence){
  if(env.isNull()||!trusted_)return;
  DynamicJsonDocument offer(10000);
  if(!verifyJson(env,command_,id_,epoch_,offer)||offer["kind"]!="firmware_offer"||offer["request_boot_id"].as<std::string>()!=boot_||offer["request_seq"].as<uint64_t>()!=pollSequence||offer["config_epoch"].as<unsigned>()!=config_||offer["expires_at_s"].as<uint64_t>()<=utc()/1000)return;
  auto manifest=offer["manifest"].as<JsonVariantConst>();const auto target=offer["target_id"].as<std::string>();
  if(manifest["profile"].as<std::string>()!=role_||manifest["board"]!="esp32dev"||manifest["secure_version"].as<unsigned>()<=state_.getUInt("secure",0))return;
  if(!verifyManifest(manifest,offer["manifest_signature"].as<std::string>(),cfg_["ota_public_key_pem"].as<std::string>())){receipt(target.c_str(),"failed","manifest_signature_invalid",manifest);return;}
#if !defined(CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE) || !CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE
  receipt(target.c_str(),"failed","rollback_bootloader_unqualified",manifest);return;
#else
  if(!cfg_["ota_qualified"].as<bool>()){receipt(target.c_str(),"failed","ota_not_qualified",manifest);return;}
  const unsigned size=manifest["size_bytes"].as<unsigned>();if(size<1024||size>2097152)return;
  DynamicJsonDocument p(4096);identity(p,"firmware_download");p["target_id"]=target;
  WiFiClientSecure tls;tls.setCACert(ca_.c_str());HTTPClient http;http.setConnectTimeout(5000);http.setTimeout(10000);
  if(!http.begin(tls,(origin_+"/api/v1/device/firmware/download").c_str()))return;
  http.addHeader("Content-Type","application/json");const auto body=signJson(p.as<JsonVariantConst>(),telemetry_,id_,epoch_);
  int code=http.POST(String(body.c_str()));
  if(code!=200||http.getSize()!=static_cast<int>(size)||!Update.begin(size,U_FLASH)){http.end();receipt(target.c_str(),"failed","download_or_partition_failed",manifest);return;}
  mbedtls_sha256_context hash;mbedtls_sha256_init(&hash);mbedtls_sha256_starts_ret(&hash,0);
  auto* stream=http.getStreamPtr();unsigned done=0;uint8_t buffer[1024];bool good=true;
  while(done<size&&good){std::size_t got=stream->readBytes(buffer,std::min<std::size_t>(sizeof(buffer),size-done));if(!got){good=false;break;}mbedtls_sha256_update_ret(&hash,buffer,got);good=Update.write(buffer,got)==got;done+=got;vTaskDelay(1);}
  unsigned char digest[32];mbedtls_sha256_finish_ret(&hash,digest);mbedtls_sha256_free(&hash);http.end();
  const char* hex="0123456789abcdef";std::string actual;for(auto b:digest){actual+=hex[b>>4];actual+=hex[b&15];}
  if(!good||done!=size||actual!=manifest["sha256"].as<std::string>()){Update.abort();receipt(target.c_str(),"failed","image_hash_mismatch",manifest);return;}
  // Store immutable reboot intent before selecting the new application partition.
  DynamicJsonDocument pending(4096);pending["target_id"]=target;pending["manifest"]=manifest;
  if(!writeAtomic("/ota-pending.json",canonicalJson(pending.as<JsonVariantConst>()))||!receipt(target.c_str(),"staged","image_verified",manifest)){Update.abort();LittleFS.remove("/ota-pending.json");return;}
  if(!flushFile(String("/queue/f-")+target.c_str()+"-staged.json")){Update.abort();LittleFS.remove("/ota-pending.json");return;}
  if(!Update.end()){LittleFS.remove("/ota-pending.json");receipt(target.c_str(),"failed","ota_finalize_failed",manifest);return;}
  flushOne();ESP.restart();
#endif
 }
 void confirmBoot(){
#if defined(CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE) && CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE
  if(!LittleFS.exists("/ota-pending.json")||!trusted_)return;
  File f=LittleFS.open("/ota-pending.json");DynamicJsonDocument pending(4096);if(deserializeJson(pending,f)){f.close();return;}f.close();
  auto manifest=pending["manifest"].as<JsonVariantConst>();unsigned size=manifest["size_bytes"].as<unsigned>();
  const esp_partition_t* running=esp_ota_get_running_partition();if(!running||!size||size>running->size)return;
  mbedtls_sha256_context hash;mbedtls_sha256_init(&hash);mbedtls_sha256_starts_ret(&hash,0);unsigned done=0;uint8_t buffer[1024];bool good=true;
  while(done<size){unsigned count=std::min<unsigned>(sizeof(buffer),size-done);if(esp_partition_read(running,done,buffer,count)!=ESP_OK){good=false;break;}mbedtls_sha256_update_ret(&hash,buffer,count);done+=count;}
  unsigned char digest[32];mbedtls_sha256_finish_ret(&hash,digest);mbedtls_sha256_free(&hash);
  const char* hex="0123456789abcdef";std::string actual;for(auto b:digest){actual+=hex[b>>4];actual+=hex[b&15];}
  bool healthy=good&&actual==manifest["sha256"].as<std::string>()&&cfg_["ota_qualified"].as<bool>();
  auto target=pending["target_id"].as<std::string>();
  if(healthy){
   if(esp_ota_mark_app_valid_cancel_rollback()!=ESP_OK)return;
   if(!receipt(target.c_str(),"boot_confirmed","storage_transport_health_passed",manifest))return;
   state_.putUInt("secure",manifest["secure_version"].as<unsigned>());LittleFS.remove("/ota-pending.json");
  }else{receipt(target.c_str(),"rolled_back","running_image_mismatch",manifest);LittleFS.remove("/ota-pending.json");}
#endif
 }
 void poll(){
  DynamicJsonDocument p(4096);identity(p,"poll");std::string response;
  if(request("/device/poll",signJson(p.as<JsonVariantConst>(),telemetry_,id_,epoch_),response)!=200)return;
  DynamicJsonDocument reply(32768),time(4096);if(deserializeJson(reply,response))return;
  if(!verifyJson(reply["signed_time"],command_,id_,epoch_,time)||time["kind"]!="time"||time["request_boot_id"].as<std::string>()!=boot_||time["request_seq"].as<uint64_t>()!=sequence_||time["config_epoch"].as<unsigned>()!=config_)return;
  uint64_t seconds=time["issued_at_s"].as<uint64_t>();if(seconds<state_.getULong64("utc_lower",0))return;
  anchorMs_=seconds*1000;anchorUptime_=uptime();trusted_=true;state_.putULong64("utc_lower",seconds);
  timeval now{static_cast<time_t>(seconds),0};settimeofday(&now,nullptr);
  for(JsonVariantConst envelope:reply["commands"].as<JsonArrayConst>()){
   DynamicJsonDocument command(4096);if(!verifyJson(envelope,command_,id_,epoch_,command)||command["kind"]!="relay_command")continue;
   if(command["config_epoch"].as<unsigned>()!=config_||command["expires_at_s"].as<uint64_t>()<=seconds||command["issued_at_s"].as<uint64_t>()>seconds||command["expires_at_s"].as<uint64_t>()-command["issued_at_s"].as<uint64_t>()>120)continue;
   uint64_t seq=command["seq"].as<uint64_t>();if(seq<=state_.getULong64("command_seq",0))continue;
   DynamicJsonDocument rejection(4096);identity(rejection,"command_receipt");rejection["command_id"]=command["command_id"];rejection["command_seq"]=seq;rejection["result"]="rejected";rejection["observed_on"]=nullptr;rejection["observed_at_ms"]=utc();rejection["reason_code"]="hardware_unqualified";
   if(enqueue(rejection,String("c-")+command["command_id"].as<const char*>()))state_.putULong64("command_seq",seq);
  }
  confirmBoot();firmware(reply["firmware"],p["seq"].as<uint64_t>());
 }
 public:
 bool begin(const char* role){
  role_=role;if(!LittleFS.begin(false))return false;
  File f=LittleFS.open("/device.json");if(!f||deserializeJson(cfg_,f)){f.close();return false;}f.close();
  id_=cfg_["device_id"].as<std::string>();origin_=cfg_["api_origin"].as<std::string>();ca_=cfg_["tls_ca_pem"].as<std::string>();epoch_=cfg_["key_epoch"].as<unsigned>();config_=cfg_["config_epoch"].as<unsigned>();
  if(id_.size()!=36||origin_.rfind("https://",0)!=0||origin_.find_first_of("?#\r\n")!=std::string::npos||ca_.empty()||!epoch_||!config_||cfg_["profile"].as<std::string>()!=role_||!hexKey(cfg_["telemetry_key_hex"],telemetry_)||!hexKey(cfg_["command_key_hex"],command_)||telemetry_==command_)return false;
  if(!state_.begin("smartclamp",false))return false;
  uint8_t random[16];esp_fill_random(random,sizeof(random));static const char* hex="0123456789abcdef";for(auto b:random){boot_+=hex[b>>4];boot_+=hex[b&15];}
  if(!LittleFS.exists("/queue"))LittleFS.mkdir("/queue");
  const uint64_t hint=std::max<uint64_t>(cfg_["bootstrap_unix_s"].as<uint64_t>(),state_.getULong64("utc_lower",0));if(!hint)return false;
  timeval now{static_cast<time_t>(hint),0};settimeofday(&now,nullptr); // TLS bootstrap hint; never command authorization time.
  WiFi.mode(WIFI_STA);WiFi.begin(cfg_["wifi_ssid"].as<const char*>(),cfg_["wifi_password"].as<const char*>());
  ready_=true;return true;
 }
 void tick(){
  if(!ready_||WiFi.status()!=WL_CONNECTED)return;
  const uint32_t ms=millis();
  if(!lastPoll_||static_cast<uint32_t>(ms-lastPoll_)>=30000){lastPoll_=ms;poll();}
  if(!lastBeat_||static_cast<uint32_t>(ms-lastBeat_)>=60000){
   lastBeat_=ms;DynamicJsonDocument p(4096);identity(p,"heartbeat");p["role"]=role_;p["quality"]="uncalibrated";p.createNestedObject("metrics");
   enqueue(p,String(boot_.c_str())+"-"+String(static_cast<unsigned long>(sequence_)));
  }
  flushOne();
 }
};
}
#endif
