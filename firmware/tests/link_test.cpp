#include "link_frames.hpp"
#include <cassert>
#include <iostream>
using namespace sc::link;
int main(){
 BusFrame frame{17,2,0x12345678,{0,1,2,255}};auto bytes=encodeBus(frame);BusFrame decoded;
 assert(decodeBus(bytes,decoded)&&decoded.address==17&&decoded.sequence==frame.sequence&&decoded.payload==frame.payload);
 for(std::size_t i=0;i<bytes.size();++i){auto bad=bytes;bad[i]^=1;assert(!decodeBus(bad,decoded));}
 frame.address=0;assert(encodeBus(frame).empty());frame.address=248;assert(encodeBus(frame).empty());frame.address=1;frame.payload.resize(513);assert(encodeBus(frame).empty());
 std::array<uint8_t,16> id{};std::string original(16384,'a');original[200]='b';auto fragments=split(id,original);assert(fragments.size()==95);
 Reassembler r;std::string result;assert(r.add(fragments.back(),1,result)==Reassembler::Result::Partial);
 assert(r.add(fragments.back(),2,result)==Reassembler::Result::Duplicate);auto conflict=fragments.back();conflict.bytes[0]^=1;assert(r.add(conflict,3,result)==Reassembler::Result::Conflict);
 for(std::size_t i=0;i<fragments.size()-1;++i){auto encoded=encodeFragment(fragments[i]);assert(encoded.size()<=200);Fragment f;assert(decodeFragment(encoded,f));assert(r.add(f,4,result)==(i==fragments.size()-2?Reassembler::Result::Complete:Reassembler::Result::Partial));}
 assert(result==original);
 for(unsigned i=0;i<4;++i){auto f=fragments[0];f.id[0]=i;assert(r.add(f,100,result)==Reassembler::Result::Partial);}
 auto f=fragments[0];f.id[0]=5;assert(r.add(f,101,result)==Reassembler::Result::Full);assert(r.add(f,10100,result)==Reassembler::Result::Partial);
 auto malformed=encodeFragment(f);malformed[24]^=1;Fragment unused;assert(!decodeFragment(malformed,unused));
 assert(split(id,std::string(16385,'a')).empty());
 std::cout<<"RS485 framing and bounded radio fragmentation/reassembly passed. No electrical/radio qualification implied.\n";
}
