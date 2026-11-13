#include "wire.hpp"
#include <fstream>
#include <iterator>
#include <cassert>
#include <iostream>
int main(int argc,char** argv){
 assert(argc==2);std::ifstream f(argv[1]);std::string fixture((std::istreambuf_iterator<char>(f)),{});DynamicJsonDocument data(20000);assert(!deserializeJson(data,fixture));
 std::array<uint8_t,32> key{};assert(sc::hexKey(data["key"],key));
 DynamicJsonDocument p(4096);p["z"]=2;p["a"]=true;p["nested"]["b"]=2;p["nested"]["a"]=1;
 assert(sc::canonicalJson(p.as<JsonVariantConst>())=="{\"a\":true,\"nested\":{\"a\":1,\"b\":2},\"z\":2}");
 DynamicJsonDocument decoded(4096);assert(sc::verifyJson(data["envelope"],key,data["device_id"],1,decoded));
 assert(sc::sha256(sc::canonicalJson(decoded.as<JsonVariantConst>()))==data["payload_sha256"].as<std::string>());
 assert(sc::verifyManifest(data["manifest"],data["signature"],data["public_key"]));
 data["manifest"]["secure_version"]=99;assert(!sc::verifyManifest(data["manifest"],data["signature"],data["public_key"]));
 data["envelope"]["signature"]=std::string(64,'0');assert(!sc::verifyJson(data["envelope"],key,data["device_id"],1,decoded));
 std::cout<<"Compiled firmware JSON canonicalization, cloud HMAC and RSA image-manifest verification passed.\n";
}
