#pragma once
#include "runtime.hpp"
#include <array>
#include <limits>
namespace sc {
struct AllowedWindow {uint16_t start=0,end=0;}; // Monday 00:00=0, end exclusive; Lagos UTC+1.
struct AutomationPolicy {
 uint64_t seq=0,anchorMwh=0,dailyMwh=0,monthlyMwh=0,extraDailyMwh=0,extraDay=0;
 uint32_t keyEpoch=0,configEpoch=0,counterEpoch=0;
 std::array<uint8_t,16> subject{}; // Authenticated resident UUID from the signed policy.
 bool scheduleEnabled=false;uint8_t windowCount=0;std::array<AllowedWindow,8> windows{};
};
struct AutomationState {
 AutomationPolicy policy;uint64_t counter=0,lastUtc=0,day=0,month=0,dailyBase=0,monthlyBase=0;
 bool known=false,counterKnown=false;
};
struct AutomationStore {
 virtual ~AutomationStore()=default;
 virtual bool load(AutomationState&)=0;
 // Integrity-checked, atomic full journal record; no successful action before commit.
 virtual bool persist(const AutomationState&)=0;
};
class Automation {
 AutomationStore& store_;AutomationState state_{};uint32_t key_,config_,counter_;bool healthy_=false,fresh_=false;
 static bool same(const AutomationPolicy& a,const AutomationPolicy& b){
  if(a.seq!=b.seq||a.anchorMwh!=b.anchorMwh||a.dailyMwh!=b.dailyMwh||a.monthlyMwh!=b.monthlyMwh||a.extraDailyMwh!=b.extraDailyMwh||a.extraDay!=b.extraDay||a.keyEpoch!=b.keyEpoch||a.configEpoch!=b.configEpoch||a.counterEpoch!=b.counterEpoch||a.scheduleEnabled!=b.scheduleEnabled||a.windowCount!=b.windowCount||a.subject!=b.subject)return false;
  for(unsigned i=0;i<a.windowCount;++i)if(a.windows[i].start!=b.windows[i].start||a.windows[i].end!=b.windows[i].end)return false;
  return true;
 }
 bool valid(const AutomationPolicy& p)const{
  bool subjectKnown=false;for(auto byte:p.subject)subjectKnown=subjectKnown||byte!=0;
  if(!subjectKnown||!p.seq||p.keyEpoch!=key_||p.configEpoch!=config_||p.counterEpoch!=counter_||p.windowCount>8||p.dailyMwh>std::numeric_limits<uint64_t>::max()-p.extraDailyMwh)return false;
  if(!p.dailyMwh&&p.extraDailyMwh)return false;
  for(unsigned i=0;i<p.windowCount;++i)if(p.windows[i].start>=p.windows[i].end||p.windows[i].end>10080)return false;
  return true;
 }
 // Gregorian month index from a UTC+1 civil day. No libc timezone/DST dependency.
 static uint64_t monthForDay(uint64_t day){
  int64_t z=static_cast<int64_t>(day)+719468;const int64_t era=z/146097;
  const unsigned doe=static_cast<unsigned>(z-era*146097),yoe=(doe-doe/1460+doe/36524-doe/146096)/365;
  int64_t year=static_cast<int64_t>(yoe)+era*400;const unsigned doy=doe-(365*yoe+yoe/4-yoe/100),mp=(5*doy+2)/153;
  const unsigned month=mp<10?mp+3:mp-9;year+=month<=2;
  return static_cast<uint64_t>(year*12+month-1);
 }
 bool save(const AutomationState& next){if(!store_.persist(next)){healthy_=false;fresh_=false;return false;}state_=next;return true;}
 public:
 Automation(AutomationStore& store,uint32_t key,uint32_t config,uint32_t counter):store_(store),key_(key),config_(config),counter_(counter){recover();}
 bool recover(){fresh_=false;AutomationState recovered;healthy_=store_.load(recovered);if(!healthy_)return false;if(recovered.known&&(!valid(recovered.policy)||(recovered.counterKnown&&(recovered.counter<recovered.dailyBase||recovered.counter<recovered.monthlyBase)))){healthy_=false;return false;}state_=recovered;return true;}
 bool apply(const AutomationPolicy& policy,bool signatureAndRequestBindingVerified){
  if(!healthy_||!signatureAndRequestBindingVerified||!valid(policy))return false;
  if(state_.known){if(policy.seq<state_.policy.seq)return false;if(policy.seq==state_.policy.seq)return same(policy,state_.policy);}
  auto next=state_;const bool subjectChanged=state_.known&&policy.subject!=state_.policy.subject;next.policy=policy;
  // Editing limits does not reset consumption or mint a new daily/monthly allowance.
  if(!next.known||subjectChanged){next.dailyBase=policy.anchorMwh;next.monthlyBase=policy.anchorMwh;next.counterKnown=false;fresh_=false;}
  next.known=true;return save(next);
 }
 bool observe(uint64_t importMwh,uint32_t epoch,uint64_t utcSeconds,bool trustedClock,bool qualifiedCounter){
  fresh_=false;
  if(!healthy_||!state_.known||!trustedClock||!qualifiedCounter||epoch!=counter_||utcSeconds<1700000000ULL||utcSeconds>4102444800ULL||
     (state_.lastUtc&&(utcSeconds<state_.lastUtc||importMwh<state_.counter))||importMwh<state_.dailyBase||importMwh<state_.monthlyBase)return false;
  auto next=state_;const auto day=(utcSeconds+3600)/86400,month=monthForDay(day);
  // Charge a boundary-straddling/unobserved increment conservatively to the new period.
  // A reboot or delayed first reading cannot forgive energy by rebasing at the new counter.
  if(state_.counterKnown&&day>state_.day)next.dailyBase=state_.counter;
  if(state_.counterKnown&&month>state_.month)next.monthlyBase=state_.counter;
  next.counter=importMwh;next.lastUtc=utcSeconds;next.day=day;next.month=month;next.counterKnown=true;
  if(!save(next))return false;
  fresh_=true;return true;
 }
 bool ready()const{return healthy_&&fresh_&&state_.known&&state_.counterKnown;}
 bool budgetRestricted()const{
  if(!ready())return true;
  const auto& p=state_.policy;auto daily=p.dailyMwh+(p.extraDay==state_.day?p.extraDailyMwh:0);
  return (daily&&state_.counter-state_.dailyBase>=daily)||(p.monthlyMwh&&state_.counter-state_.monthlyBase>=p.monthlyMwh);
 }
 bool scheduleRestricted()const{
  if(!ready())return true;
  const auto& p=state_.policy;if(!p.scheduleEnabled)return false;
  const auto minute=((state_.day+3)%7)*1440+((state_.lastUtc+3600)%86400)/60;
  for(unsigned i=0;i<p.windowCount;++i)if(p.windows[i].start<=minute&&minute<p.windows[i].end)return false;
  return true;
 }
 bool budgetWarning()const{
  if(!ready())return false;
  const auto& p=state_.policy;auto daily=p.dailyMwh+(p.extraDay==state_.day?p.extraDailyMwh:0);
  return(daily&&state_.counter-state_.dailyBase>=daily-daily/5)||(p.monthlyMwh&&state_.counter-state_.monthlyBase>=p.monthlyMwh-p.monthlyMwh/5);
 }
 uint32_t reasons(uint32_t other)const{
  // These restrictions never clear protection, wallet, manual, maintenance or utility intent.
  auto result=budgetRestricted()?(other|Budget):(other&~static_cast<uint32_t>(Budget));
  return scheduleRestricted()?(result|Schedule):(result&~static_cast<uint32_t>(Schedule));
 }
 const AutomationState& state()const{return state_;}
};
}
