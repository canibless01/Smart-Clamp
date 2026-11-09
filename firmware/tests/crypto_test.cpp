#include "crypto.hpp"
#include <cassert>
#include <iostream>
int main(){
 std::array<uint8_t,32> key{};for(unsigned i=0;i<32;i++)key[i]=i;
 assert(sc::base64url("")=="");assert(sc::base64url("f")=="Zg");assert(sc::base64url("fo")=="Zm8");assert(sc::base64url("foo")=="Zm9v");
 const auto signature=sc::envelopeSignature(key,"00000000-0000-4000-8000-000000000001",1,"eyJhdXRob3JpemF0aW9uX3JlZiI6InRlc3QiLCJjb21tYW5kX2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAyIiwiY29uZmlnX2Vwb2NoIjoxLCJkZXZpY2VfaWQiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJleHBpcmVzX2F0X3MiOjEyMCwiaXNzdWVkX2F0X3MiOjEwMCwia2V5X2Vwb2NoIjoxLCJraW5kIjoicmVsYXlfY29tbWFuZCIsIm9uIjp0cnVlLCJwb2xpY3lfZXBvY2giOjEsInJlYXNvbiI6InNlbGYiLCJzZXEiOjF9");
 assert(signature=="6d893fecbdf20b3cb7db77724893050c0039892ec99fd6c03cfd404af67fa10b");assert(sc::equalSignature(signature,signature));
 auto changed=signature;changed[0]=changed[0]=='0'?'1':'0';assert(!sc::equalSignature(signature,changed));assert(!sc::equalSignature("",""));
 assert(sc::envelopeSignature(key,"bad\nidentity",1,"Zg").empty());assert(sc::envelopeSignature(key,"device",0,"Zg").empty());
 std::cout<<"Cross-language HMAC envelope golden vector and encoding tests passed.\n";
}
