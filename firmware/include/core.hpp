#pragma once
#include <cmath>
#include <cstddef>
#include <cstdint>
namespace sc {
enum class Role { Transformer, PoleGateway, PoleDevice, HouseFull, BuildingHub, IRReader };
struct Capabilities { unsigned currentChannels; bool voltage, gsm, espnow, rs485, relayOptional, relayRequired; };
constexpr Capabilities capabilities(Role r) {
 switch(r) {
 case Role::Transformer: return {1,true,false,false,false,false,false};
 case Role::PoleGateway: return {2,true,true,true,false,true,false};
 case Role::PoleDevice: return {2,true,false,true,false,true,false};
 case Role::HouseFull: return {1,true,false,false,true,false,true};
 case Role::BuildingHub: return {0,false,true,false,true,false,false};
 case Role::IRReader: return {0,false,false,false,false,false,false};
 }
 return {};
}
struct Measurement { double volts=0, amps=0, watts=0, apparentVA=0, powerFactor=0; bool valid=false; };
// Arrays contain calibrated simultaneous, phase-corrected volts and amps, not ADC counts.
inline Measurement measure(const double* v,const double* i,std::size_t n) {
 Measurement m; if(!v || !i || n==0) return m;
 double vv=0,ii=0,vi=0;
 for(std::size_t k=0;k<n;++k) {
  if(!std::isfinite(v[k]) || !std::isfinite(i[k])) return m;
  vv+=v[k]*v[k]; ii+=i[k]*i[k]; vi+=v[k]*i[k];
 }
 m.volts=std::sqrt(vv/n); m.amps=std::sqrt(ii/n); m.watts=vi/n;
 m.apparentVA=m.volts*m.amps;
 m.powerFactor=m.apparentVA>1e-9?m.watts/m.apparentVA:0;
 m.valid=std::isfinite(m.volts)&&std::isfinite(m.amps)&&std::isfinite(m.watts)&&std::isfinite(m.apparentVA);
 return m;
}
class Energy {
 double kwh_=0;
 public:
 bool add(const Measurement& m, double seconds) {
  // Missing intervals are gaps, never fabricated energy. Export is not imported energy.
  if(!m.valid || !std::isfinite(seconds) || seconds<=0 || seconds>10) return false;
  kwh_+= (m.watts>0?m.watts:0)*seconds/3600000.0; return true;
 }
 double kwh()const{return kwh_;}
};
enum class Reason { None, SensorInvalid, UnderVoltage, OverVoltage, NotCommissioned, FeedbackUnknown, Unstable, Replay, Expired, WrongDevice, Authentication, Storage };
struct Decision { bool allowed; Reason reason; };
class Protection {
 bool stable_=false; uint64_t since_=0;
 public:
 Decision update(bool valid,double voltage,uint64_t nowMs) {
  if(!valid || !std::isfinite(voltage)) {stable_=false; return {false,Reason::SensorInvalid};}
  if(voltage<180 || voltage>250) {stable_=false;return {false,voltage<180?Reason::UnderVoltage:Reason::OverVoltage};}
  if(!stable_ || nowMs<since_) {since_=nowMs;stable_=true;}
  return {true,Reason::None};
 }
 bool restoreReady(uint64_t nowMs) const {return stable_ && nowMs>=since_ && nowMs-since_>=300000;}
};
// Cryptographic verification occurs before this policy; sequence must be persisted BEFORE actuation.
struct Command { uint64_t sequence, issuedAt, expiresAt; bool on; };
inline Decision authorize(const Command& c,uint64_t now,uint64_t last,bool signatureValid,bool rightDevice,bool clockTrusted) {
 if(!signatureValid)return {false,Reason::Authentication};
 if(!rightDevice)return {false,Reason::WrongDevice};
 if(!clockTrusted || c.issuedAt>now || c.expiresAt<=now || c.expiresAt<=c.issuedAt || c.expiresAt-c.issuedAt>120)return {false,Reason::Expired};
 if(c.sequence<=last)return {false,Reason::Replay};
 return {true,Reason::None};
}
class RelayPolicy {
 bool commissioned_=false, feedbackKnown_=false, state_=false;
 public:
 void commission(bool driverValidated,bool knownFeedback,bool actualOn){commissioned_=driverValidated;feedbackKnown_=knownFeedback;state_=actualOn;}
 Decision request(bool on,bool stableVoltage,bool sequencePersisted) const {
  if(!commissioned_)return {false,Reason::NotCommissioned};
  if(!feedbackKnown_)return {false,Reason::FeedbackUnknown};
  if(!sequencePersisted)return {false,Reason::Storage};
  if(on&&!stableVoltage)return {false,Reason::Unstable};
  return {true,Reason::None};
 }
 void observe(bool known,bool on){feedbackKnown_=known;state_=on;}
 bool observedOn() const{return state_;}
};
}
