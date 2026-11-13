#pragma once
#include "runtime.hpp"
namespace sc {
// Electrical implementation must de-energize both outputs before energizing one,
// and supply an independently qualified maximum-pulse watchdog.
struct CoilIO {
 virtual ~CoilIO()=default;
 virtual void coils(bool open,bool close)=0;
 virtual bool auxiliary(bool& on)const=0;
};
struct CoilConfig {bool qualified=false;uint32_t pulseMs=0,cooldownMs=0,feedbackTimeoutMs=0;};
class LatchingDriver final:public Actuator {
 CoilConfig cfg_;CoilIO& io_;enum class Phase{Idle,Pulse,Feedback,Fault};Phase phase_=Phase::Idle;
 uint64_t now_=0,started_=0,stopped_=0;bool target_=false,havePulse_=false;
 public:
 LatchingDriver(CoilConfig cfg,CoilIO& io):cfg_(cfg),io_(io){}
 bool commissioned()const override{return cfg_.qualified&&cfg_.pulseMs>0&&cfg_.pulseMs<=500&&cfg_.cooldownMs>=cfg_.pulseMs&&cfg_.feedbackTimeoutMs>=cfg_.pulseMs;}
 bool feedback(bool& on)const override{return commissioned()&&phase_!=Phase::Fault&&io_.auxiliary(on);}
 bool busy()const{return phase_==Phase::Pulse||phase_==Phase::Feedback;}
 bool faulted()const{return phase_==Phase::Fault;}
 void tick(uint64_t ms){
  if(!commissioned())return;
  if(ms<now_){io_.coils(false,false);phase_=Phase::Fault;return;}now_=ms;
  if(phase_==Phase::Pulse&&ms-started_>=cfg_.pulseMs){io_.coils(false,false);stopped_=ms;phase_=Phase::Feedback;}
  if(phase_==Phase::Feedback){bool actual=false;if(io_.auxiliary(actual)&&actual==target_){phase_=Phase::Idle;return;}if(ms-stopped_>=cfg_.feedbackTimeoutMs)phase_=Phase::Fault;}
 }
 bool request(bool on)override{
  if(!commissioned())return false;
  // Never reverse or extend a live pulse, and never repeat one while awaiting feedback.
  if(busy())return target_==on;
  if(phase_==Phase::Fault)return false;
  bool actual=false;const bool known=io_.auxiliary(actual);
  if(on&&!known)return false;
  if(known&&actual==on)return true;
  if(havePulse_&&(now_<stopped_||now_-stopped_<cfg_.cooldownMs))return false;
  target_=on;started_=now_;havePulse_=true;phase_=Phase::Pulse;
  io_.coils(false,false);io_.coils(!on,on);return true;
 }
 // Only explicit maintenance/recommissioning can clear a feedback fault.
 bool acknowledgeFault(){bool actual=false;if(phase_!=Phase::Fault||!io_.auxiliary(actual))return false;io_.coils(false,false);phase_=Phase::Idle;stopped_=now_;return true;}
};
}
