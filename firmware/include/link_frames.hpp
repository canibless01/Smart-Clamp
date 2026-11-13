#pragma once
#include <array>
#include <vector>
#include <string>
#include <cstdint>
#include <algorithm>
namespace sc::link {
inline uint32_t crc32(const uint8_t* data,std::size_t size){uint32_t crc=0xffffffff;for(std::size_t n=0;n<size;++n){crc^=data[n];for(unsigned b=0;b<8;++b)crc=(crc>>1)^(0xedb88320u&static_cast<uint32_t>(-static_cast<int32_t>(crc&1)));}return ~crc;}
inline void put16(std::vector<uint8_t>& b,uint16_t v){b.push_back(v>>8);b.push_back(v&255);}
inline void put32(std::vector<uint8_t>& b,uint32_t v){for(int shift=24;shift>=0;shift-=8)b.push_back((v>>shift)&255);}
inline uint16_t u16(const uint8_t* b){return static_cast<uint16_t>((b[0]<<8)|b[1]);}
inline uint32_t u32(const uint8_t* b){return (uint32_t(b[0])<<24)|(uint32_t(b[1])<<16)|(uint32_t(b[2])<<8)|b[3];}
struct BusFrame {uint8_t address=0,type=0;uint32_t sequence=0;std::vector<uint8_t> payload;};
inline std::vector<uint8_t> encodeBus(const BusFrame& f){
 if(!f.address||f.address>247||f.payload.size()>512)return {};
 std::vector<uint8_t> b{0x53,0x43,1,f.address,f.type};put32(b,f.sequence);put16(b,static_cast<uint16_t>(f.payload.size()));b.insert(b.end(),f.payload.begin(),f.payload.end());put32(b,crc32(b.data(),b.size()));return b;
}
inline bool decodeBus(const std::vector<uint8_t>& b,BusFrame& f){
 if(b.size()<15||b[0]!=0x53||b[1]!=0x43||b[2]!=1||!b[3]||b[3]>247)return false;
 const auto length=u16(b.data()+9);if(length>512||b.size()!=15u+length||u32(b.data()+b.size()-4)!=crc32(b.data(),b.size()-4))return false;
 f.address=b[3];f.type=b[4];f.sequence=u32(b.data()+5);f.payload.assign(b.begin()+11,b.end()-4);return true;
}
// Fragment extension: version, immutable message UUID, part/count, total length,
// bytes, CRC32. Radio frames never exceed 200 bytes; original SC1 HMAC remains intact.
struct Fragment {std::array<uint8_t,16> id{};uint16_t part=0,count=0,total=0;std::vector<uint8_t> bytes;};
constexpr std::size_t FragmentPayload=173,MaxMessage=16384;
inline std::vector<uint8_t> encodeFragment(const Fragment& f){
 if(!f.total||f.total>MaxMessage||!f.count||f.count!=(f.total+FragmentPayload-1)/FragmentPayload||f.part>=f.count||f.bytes.size()!=std::min<std::size_t>(FragmentPayload,f.total-f.part*FragmentPayload))return {};
 std::vector<uint8_t> b{1};b.insert(b.end(),f.id.begin(),f.id.end());put16(b,f.part);put16(b,f.count);put16(b,f.total);b.insert(b.end(),f.bytes.begin(),f.bytes.end());put32(b,crc32(b.data(),b.size()));return b;
}
inline bool decodeFragment(const std::vector<uint8_t>& b,Fragment& f){
 if(b.size()<28||b.size()>200||b[0]!=1||u32(b.data()+b.size()-4)!=crc32(b.data(),b.size()-4))return false;
 std::copy(b.begin()+1,b.begin()+17,f.id.begin());f.part=u16(b.data()+17);f.count=u16(b.data()+19);f.total=u16(b.data()+21);f.bytes.assign(b.begin()+23,b.end()-4);return !encodeFragment(f).empty();
}
inline std::vector<Fragment> split(const std::array<uint8_t,16>& id,const std::string& bytes){
 if(bytes.empty()||bytes.size()>MaxMessage)return {};
 std::vector<Fragment> out;const uint16_t count=static_cast<uint16_t>((bytes.size()+FragmentPayload-1)/FragmentPayload);
 for(uint16_t part=0;part<count;++part){const auto begin=std::size_t(part)*FragmentPayload,end=std::min(bytes.size(),begin+FragmentPayload);Fragment f{id,part,count,static_cast<uint16_t>(bytes.size()),{}};f.bytes.assign(bytes.begin()+begin,bytes.begin()+end);out.push_back(std::move(f));}return out;
}
class Reassembler {
 struct Slot {bool used=false;std::array<uint8_t,16> id{};uint16_t count=0,total=0;uint64_t started=0;std::vector<std::vector<uint8_t>> parts;std::vector<bool> received;};
 std::array<Slot,4> slots_{};
 public:
 enum class Result {Invalid,Full,Conflict,Partial,Duplicate,Complete};
 Result add(const Fragment& f,uint64_t ms,std::string& completed){
  completed.clear();if(encodeFragment(f).empty())return Result::Invalid;
  for(auto& s:slots_)if(s.used&&(ms<s.started||ms-s.started>=10000))s=Slot{};
  Slot* selected=nullptr;for(auto& s:slots_)if(s.used&&s.id==f.id){selected=&s;break;}
  if(!selected){for(auto& s:slots_)if(!s.used){selected=&s;break;}if(!selected)return Result::Full;
   selected->used=true;selected->id=f.id;selected->count=f.count;selected->total=f.total;selected->started=ms;selected->parts.resize(f.count);selected->received.resize(f.count,false);
  }
  auto& s=*selected;if(s.count!=f.count||s.total!=f.total)return Result::Conflict;
  if(s.received[f.part])return s.parts[f.part]==f.bytes?Result::Duplicate:Result::Conflict;
  s.parts[f.part]=f.bytes;s.received[f.part]=true;
  if(!std::all_of(s.received.begin(),s.received.end(),[](bool b){return b;}))return Result::Partial;
  for(auto& part:s.parts)completed.append(part.begin(),part.end());
  s=Slot{};return Result::Complete;
 }
};
}
