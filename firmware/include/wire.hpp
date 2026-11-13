#pragma once
#include <string>
#include <array>
#include <cstdint>
#include <vector>
#include <algorithm>
#include "crypto.hpp"
#include <ArduinoJson.h>
#include <cstring>
#ifdef ARDUINO
#include <mbedtls/sha256.h>
#include <mbedtls/pk.h>
#else
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/sha.h>
#endif
namespace sc {
inline std::string sha256(const std::string& s){
 unsigned char digest[32];
#ifdef ARDUINO
 if(mbedtls_sha256_ret(reinterpret_cast<const unsigned char*>(s.data()),s.size(),digest,0)!=0)return {};
#else
 if(!SHA256(reinterpret_cast<const unsigned char*>(s.data()),s.size(),digest))return {};
#endif
 static const char hex[]="0123456789abcdef";std::string out;for(auto b:digest){out+=hex[b>>4];out+=hex[b&15];}return out;
}
inline bool hexKey(const char* s,std::array<uint8_t,32>& key){
 if(!s||strlen(s)!=64)return false;
 auto digit=[](char c)->int{return c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:-1;};
 for(unsigned i=0;i<32;++i){int a=digit(s[2*i]),b=digit(s[2*i+1]);if(a<0||b<0)return false;key[i]=static_cast<uint8_t>((a<<4)|b);}return true;
}
inline bool decode64(const std::string& encoded,std::string& out,bool url=true){
 const std::string alphabet=url?"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_":"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 uint32_t bits=0;unsigned held=0;out.clear();bool pad=false;
 for(char c:encoded){if(c=='='&&!url){pad=true;continue;}if(pad)return false;auto index=alphabet.find(c);if(index==std::string::npos)return false;bits=(bits<<6)|static_cast<uint32_t>(index);held+=6;if(held>=8){held-=8;out+=static_cast<char>((bits>>held)&255);}}
 return held<6 && (held==0 || (bits&((1u<<held)-1))==0);
}
// Canonical protocol bytes: sorted object keys, compact ASCII-safe provisioned fields,
// integer values only. Dynamic incoming strings are never reserialized before HMAC.
inline std::string canonicalJson(JsonVariantConst v){
 if(v.is<JsonObjectConst>()){
  std::vector<std::string> keys;for(JsonPairConst p:v.as<JsonObjectConst>())keys.emplace_back(p.key().c_str());std::sort(keys.begin(),keys.end());
  std::string out="{";for(auto& key:keys){if(out.size()>1)out+=',';std::string encoded;DynamicJsonDocument stringDoc(key.size()*2+64);stringDoc.set(key);serializeJson(stringDoc,encoded);out+=encoded;out+=':';out+=canonicalJson(v[key]);}return out+"}";
 }
 if(v.is<JsonArrayConst>()){std::string out="[";for(JsonVariantConst item:v.as<JsonArrayConst>()){if(out.size()>1)out+=',';out+=canonicalJson(item);}return out+"]";}
 std::string out;serializeJson(v,out);return out;
}
inline std::string signJson(JsonVariantConst payload,const std::array<uint8_t,32>& key,const std::string& device,unsigned epoch){
 const auto encoded=base64url(canonicalJson(payload));const auto signature=envelopeSignature(key,device,epoch,encoded);
 DynamicJsonDocument doc(16000);doc["device_id"]=device;doc["key_epoch"]=epoch;doc["payload_b64"]=encoded;doc["signature"]=signature;std::string out;serializeJson(doc,out);return out;
}
inline bool verifyJson(JsonVariantConst envelope,const std::array<uint8_t,32>& key,const std::string& device,unsigned epoch,JsonDocument& payload){
 if(!envelope.is<JsonObjectConst>()||envelope.size()!=4||envelope["device_id"].as<std::string>()!=device||envelope["key_epoch"].as<unsigned>()!=epoch)return false;
 const auto encoded=envelope["payload_b64"].as<std::string>();if(encoded.size()>10924)return false;
 if(!equalSignature(envelopeSignature(key,device,epoch,encoded),envelope["signature"].as<std::string>()))return false;
 std::string bytes;if(!decode64(encoded,bytes)||bytes.size()>8192||deserializeJson(payload,bytes))return false;
 return payload["device_id"].as<std::string>()==device&&payload["key_epoch"].as<unsigned>()==epoch;
}
inline bool verifyManifest(JsonVariantConst manifest,const std::string& signature,const std::string& publicPem){
 std::string decoded;if(!decode64(signature,decoded,false))return false;
#ifndef ARDUINO
 BIO* bio=BIO_new_mem_buf(publicPem.data(),static_cast<int>(publicPem.size()));if(!bio)return false;
 EVP_PKEY* key=PEM_read_bio_PUBKEY(bio,nullptr,nullptr,nullptr);BIO_free(bio);if(!key)return false;
 EVP_MD_CTX* context=EVP_MD_CTX_new();const auto bytes=canonicalJson(manifest);
 bool ok=context&&EVP_PKEY_base_id(key)==EVP_PKEY_RSA&&EVP_PKEY_bits(key)>=3072&&EVP_DigestVerifyInit(context,nullptr,EVP_sha256(),nullptr,key)==1&&EVP_DigestVerify(context,reinterpret_cast<const unsigned char*>(decoded.data()),decoded.size(),reinterpret_cast<const unsigned char*>(bytes.data()),bytes.size())==1;
 EVP_MD_CTX_free(context);EVP_PKEY_free(key);return ok;
#else
 mbedtls_pk_context key;mbedtls_pk_init(&key);
 int result=mbedtls_pk_parse_public_key(&key,reinterpret_cast<const unsigned char*>(publicPem.c_str()),publicPem.size()+1);
 const auto bytes=canonicalJson(manifest);unsigned char digest[32];
 if(!result)result=mbedtls_sha256_ret(reinterpret_cast<const unsigned char*>(bytes.data()),bytes.size(),digest,0);
 if(!result && (mbedtls_pk_get_bitlen(&key)<3072 || !mbedtls_pk_can_do(&key,MBEDTLS_PK_RSA)))result=-1;
 if(!result)result=mbedtls_pk_verify(&key,MBEDTLS_MD_SHA256,digest,32,reinterpret_cast<const unsigned char*>(decoded.data()),decoded.size());
 mbedtls_pk_free(&key);return result==0;
#endif
}
}
