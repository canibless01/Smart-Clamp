#pragma once
#include "core.hpp"
#include <array>
#include <algorithm>
namespace sc {
enum OffReason : uint32_t { Unsafe=1, WalletZero=2, Budget=4, Schedule=8, Manual=16, Maintenance=32, Utility=64 };
struct RuntimeConfig {
 bool relay=false,autoRestore=false; uint64_t lostMs=3000,returnMs=10000;
 double absentV=50; uint32_t reportMs=60000;
};
struct Event { enum Kind { Reading,SupplyLost,SupplyReturned,ProtectionTrip,Overflow } kind; uint64_t sequence,atMs; Measurement reading; };
// Durable hardware adapter must atomically append events and counter before returning true.
struct Journal {
 virtual ~Journal()=default;
 virtual bool append(Event&)=0;
 virtual bool acknowledge(uint64_t)=0;
 virtual bool persistCommand(uint64_t,uint32_t offReasons)=0;
 virtual uint64_t lastCommand()const=0;
};
struct Actuator {
 virtual ~Actuator()=default;
 virtual bool commissioned()const=0;
 virtual bool feedback(bool& on)const=0;
 // Must bound pulse, interlock both coil outputs, verify feedback; never block sensor task.
 virtual bool request(bool on)=0;
};
enum class Supply { Unknown,Present,Absent };
class Runtime {
 RuntimeConfig cfg_;Journal& journal_;Actuator& actuator_;
 Protection protection_;uint32_t off_=0;Supply supply_=Supply::Unknown;
 bool lastBelow_=false,candidate_=false,safe_=false,storageHealthy_=true,recovered_=false;
 uint64_t candidateSince_=0,lastReport_=0,now_=0;
 Measurement last_;
 void emit(Event::Kind k,uint64_t ms,const Measurement& m){Event e{k,0,ms,m}; if(!journal_.append(e))storageHealthy_=false;}
 public:
 Runtime(RuntimeConfig cfg,Journal& j,Actuator& a):cfg_(cfg),journal_(j),actuator_(a){}
 void recoverIntent(uint32_t reasons){off_=reasons;recovered_=true;}
 void setReason(OffReason r,bool active){if(active)off_|=r;else off_&=~static_cast<uint32_t>(r);}
 uint32_t reasons()const{return off_;}
 Supply supply()const{return supply_;}
 bool healthyStorage()const{return storageHealthy_;}
 void sample(const Measurement& m,uint64_t ms){
  now_=ms;last_=m;
  const auto d=protection_.update(m.valid,m.volts,ms);safe_=d.allowed;
  if(!d.allowed){if(!(off_&Unsafe))emit(Event::ProtectionTrip,ms,m);setReason(Unsafe,true);}
  if(cfg_.autoRestore&&protection_.restoreReady(ms))setReason(Unsafe,false);
  if(m.valid){
   const bool below=m.volts<cfg_.absentV;
   if(!candidate_||lastBelow_!=below||ms<candidateSince_){candidate_=true;candidateSince_=ms;lastBelow_=below;}
   const auto dwell=below?cfg_.lostMs:cfg_.returnMs;
   if(ms>=candidateSince_&&ms-candidateSince_>=dwell){
    auto next=below?Supply::Absent:Supply::Present;
    if(next!=supply_){supply_=next;emit(below?Event::SupplyLost:Event::SupplyReturned,ms,m);}
   }
  }else candidate_=false;
  if(ms<lastReport_)lastReport_=ms;
  if(ms-lastReport_>=cfg_.reportMs){emit(Event::Reading,ms,m);lastReport_=ms;}
  reconcile();
 }
 bool restore(){if(!protection_.restoreReady(now_))return false;setReason(Unsafe,false);return reconcile();}
 Decision command(const Command& c,uint64_t epochSeconds,bool sig,bool device,bool clock){
  auto d=authorize(c,epochSeconds,journal_.lastCommand(),sig,device,clock);if(!d.allowed)return d;
  if(!cfg_.relay||!actuator_.commissioned())return {false,Reason::NotCommissioned};
  bool observed=false;if(!actuator_.feedback(observed))return {false,Reason::FeedbackUnknown};
  // Do not consume replay sequence unless durable record succeeds. No pulse on failure.
  if(c.on&&!recovered_)return {false,Reason::Storage};
  const auto next=c.on?(off_&~static_cast<uint32_t>(Manual)):(off_|Manual);
  if(!journal_.persistCommand(c.sequence,next))return {false,Reason::Storage};
  off_=next;
  if(c.on&&(off_||!safe_))return {false,Reason::Unstable};
  return {reconcile(),Reason::None};
 }
 bool reconcile(){
  if(!cfg_.relay||!actuator_.commissioned())return false;
  bool current=false;if(!actuator_.feedback(current))return false;
  if(off_==0&&!recovered_)return false; // Never restore an unknown pre-boot OFF intent.
  const bool desired=off_==0;
  // Protective OFF can proceed even if journal full, but never enable ON with unhealthy journal.
  if(desired&&(!safe_||!storageHealthy_))return false;
  return current==desired || actuator_.request(desired);
 }
};
}
