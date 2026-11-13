#pragma once
#include <cstdint>
#include "runtime.hpp"
namespace sc {
struct CreditPolicy {
 uint64_t seq=0,ceilingMwh=0,baselineMwh=0;
 uint32_t keyEpoch=0,configEpoch=0,counterEpoch=0;
};
struct CreditState {CreditPolicy policy;uint64_t importMwh=0;bool policyKnown=false,counterKnown=false;};
// An implementation must atomically journal the full state before success and
// recover only a complete integrity-checked record after power loss.
struct CreditStore {
 virtual ~CreditStore()=default;
 virtual bool load(CreditState&)=0;
 virtual bool persist(const CreditState&)=0;
};
class PrepaidPolicy {
 CreditStore& store_;CreditState state_{};bool healthy_=false,counterFresh_=false;
 uint32_t key_,config_,counter_;
 bool matches(const CreditPolicy& p)const{return p.keyEpoch==key_&&p.configEpoch==config_&&p.counterEpoch==counter_;}
 static bool same(const CreditPolicy& a,const CreditPolicy& b){return a.seq==b.seq&&a.ceilingMwh==b.ceilingMwh&&a.baselineMwh==b.baselineMwh&&a.keyEpoch==b.keyEpoch&&a.configEpoch==b.configEpoch&&a.counterEpoch==b.counterEpoch;}
 public:
 PrepaidPolicy(CreditStore& store,uint32_t key,uint32_t config,uint32_t counter):store_(store),key_(key),config_(config),counter_(counter){recover();}
 bool recover(){
  CreditState recovered;counterFresh_=false;healthy_=store_.load(recovered);
  if(!healthy_)return false;
  if(recovered.policyKnown&&(!matches(recovered.policy)||!recovered.policy.seq||recovered.policy.ceilingMwh<recovered.policy.baselineMwh)){healthy_=false;return false;}
  state_=recovered;return true;
 }
 bool apply(const CreditPolicy& policy,bool signatureAndRequestBindingVerified){
  if(!healthy_||!signatureAndRequestBindingVerified||!policy.seq||!matches(policy)||policy.ceilingMwh<policy.baselineMwh)return false;
  if(state_.policyKnown){if(policy.seq<state_.policy.seq||policy.baselineMwh!=state_.policy.baselineMwh)return false;if(policy.seq==state_.policy.seq)return same(policy,state_.policy);}
  auto next=state_;next.policy=policy;next.policyKnown=true;
  if(!store_.persist(next)){healthy_=false;return false;}state_=next;return true;
 }
 bool observeCounter(uint64_t value,uint32_t epoch,bool qualified){
  if(!healthy_)return false;
  if(!qualified||epoch!=counter_||(state_.counterKnown&&value<state_.importMwh)){healthy_=false;counterFresh_=false;return false;}
  if(state_.counterKnown&&value==state_.importMwh){counterFresh_=true;return true;}
  auto next=state_;next.importMwh=value;next.counterKnown=true;
  if(!store_.persist(next)){healthy_=false;return false;}state_=next;counterFresh_=true;return true;
 }
 bool restricted()const{return !healthy_||!counterFresh_||!state_.policyKnown||!state_.counterKnown||state_.importMwh<state_.policy.baselineMwh||state_.importMwh>=state_.policy.ceilingMwh;}
 uint64_t remainingMwh()const{return restricted()?0:state_.policy.ceilingMwh-state_.importMwh;}
 uint32_t reasons(uint32_t other)const{
  // Unavailable integrity is an authorization failure, not a measured zero balance.
  // Caller must honor restricted() and its separate storage/sensing safety gates.
  if(!healthy_||!counterFresh_||!state_.policyKnown||!state_.counterKnown||state_.importMwh<state_.policy.baselineMwh)return other;
  return state_.importMwh>=state_.policy.ceilingMwh?(other|WalletZero):(other&~static_cast<uint32_t>(WalletZero));
 }
 bool healthy()const{return healthy_;}
};
}
