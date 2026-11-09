#pragma once
#include <string>
#include <array>
#include <cstdint>
#include <cstddef>
#ifdef ARDUINO
#include <mbedtls/md.h>
#else
#include <openssl/hmac.h>
#endif
namespace sc {
inline std::string base64url(const std::string& bytes){
 static constexpr char alphabet[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
 std::string out;uint32_t bits=0;unsigned held=0;
 for(unsigned char c:bytes){bits=(bits<<8)|c;held+=8;while(held>=6){held-=6;out+=alphabet[(bits>>held)&63];}}
 if(held){out+=alphabet[(bits<<(6-held))&63];}
 return out;
}
inline std::string hmac256(const std::array<uint8_t,32>& key,const std::string& msg){
 unsigned char digest[32]={};
#ifdef ARDUINO
 const auto* info=mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
 if(!info || mbedtls_md_hmac(info,key.data(),key.size(),reinterpret_cast<const unsigned char*>(msg.data()),msg.size(),digest)!=0)return {};
#else
 unsigned len=0;if(!HMAC(EVP_sha256(),key.data(),static_cast<int>(key.size()),reinterpret_cast<const unsigned char*>(msg.data()),msg.size(),digest,&len)||len!=32)return {};
#endif
 static constexpr char hex[]="0123456789abcdef";std::string result;result.reserve(64);
 for(auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
inline bool equalSignature(const std::string& expected,const std::string& received){
 if(expected.size()!=64||received.size()!=64)return false;
 unsigned char difference=0;for(std::size_t i=0;i<64;i++)difference|=static_cast<unsigned char>(expected[i]^received[i]);return difference==0;
}
inline std::string envelopeSignature(const std::array<uint8_t,32>& key,const std::string& device,uint32_t epoch,const std::string& encoded){
 if(!epoch||device.empty()||device.find('\n')!=std::string::npos||encoded.size()>10924)return {};
 for(auto c:encoded)if(!((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'||c=='_'))return {};
 return hmac256(key,"SC1\n"+device+"\n"+std::to_string(epoch)+"\n"+encoded);
}
}
