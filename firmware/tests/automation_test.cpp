#include "automation_policy.hpp"
#include <cassert>
#include <iostream>
struct Store:sc::AutomationStore{
 sc::AutomationState saved{};bool ok=true;
 bool load(sc::AutomationState& value)override{value=saved;return ok;}
 bool persist(const sc::AutomationState& value)override{if(!ok)return false;saved=value;return true;}
};
int main(){
 Store store;sc::Automation device(store,1,2,3);assert(!device.ready());
 sc::AutomationPolicy p;p.subject[0]=1;p.seq=1;p.keyEpoch=1;p.configEpoch=2;p.counterEpoch=3;p.anchorMwh=100;p.dailyMwh=1000;p.monthlyMwh=20000;
 assert(!device.apply(p,false));assert(device.apply(p,true));
 // 2026-11-26 12:00 UTC; the offset is Lagos, not the host timezone.
 const uint64_t noon=1795694400;assert(device.observe(100,3,noon,true,true));assert(!device.budgetRestricted());
 assert(device.observe(900,3,noon+60,true,true)&&device.budgetWarning());
 assert(device.observe(1100,3,noon+120,true,true)&&device.budgetRestricted());
 sc::Automation reboot(store,1,2,3);assert(!reboot.ready());assert(reboot.observe(1100,3,noon+180,true,true)&&reboot.budgetRestricted());
 p.seq=2;p.dailyMwh=1200;assert(reboot.apply(p,true));assert(!reboot.budgetRestricted());assert(!reboot.apply(sc::AutomationPolicy{},true));
 auto altered=p;altered.dailyMwh++;assert(!reboot.apply(altered,true));
 assert(!reboot.observe(1100,3,noon+100,true,true));assert(!reboot.ready());assert(reboot.observe(1100,3,noon+200,true,true));
 const auto day=reboot.state().day;p.seq=3;p.extraDay=day;p.extraDailyMwh=500;assert(reboot.apply(p,true));
 assert(reboot.observe(1600,3,noon+240,true,true)&&!reboot.budgetRestricted());
 const auto nextMidnight=(day+1)*86400-3600;
 assert(reboot.observe(1700,3,nextMidnight,true,true));assert(reboot.state().dailyBase==1600);assert(!reboot.budgetRestricted());
 assert(reboot.observe(2800,3,nextMidnight+60,true,true)&&reboot.budgetRestricted()); // Extra allowance expired.
 p.seq=4;p.scheduleEnabled=true;p.windowCount=1;p.windows[0]={0,1};assert(reboot.apply(p,true));assert(reboot.scheduleRestricted());
 auto allowed=p;allowed.seq=5;const auto minute=((reboot.state().day+3)%7)*1440+((reboot.state().lastUtc+3600)%86400)/60;allowed.windows[0]={static_cast<uint16_t>(minute),static_cast<uint16_t>(minute+1)};assert(reboot.apply(allowed,true));assert(!reboot.scheduleRestricted());
 auto invalid=allowed;invalid.seq=6;invalid.windows[0]={10080,10081};assert(!reboot.apply(invalid,true));
 assert((reboot.reasons(sc::Unsafe|sc::Manual|sc::WalletZero)&(sc::Unsafe|sc::Manual|sc::WalletZero))==(sc::Unsafe|sc::Manual|sc::WalletZero));
 assert(!reboot.observe(0,3,nextMidnight+120,true,true));assert(!reboot.ready());
 assert(reboot.observe(2800,3,nextMidnight+120,true,true));store.ok=false;assert(!reboot.observe(2900,3,nextMidnight+180,true,true));assert(!reboot.ready());assert(store.saved.counter==2800);
 store.ok=true;assert(reboot.recover());assert(!reboot.observe(2800,4,nextMidnight+200,true,true));assert(!reboot.observe(2800,3,nextMidnight+200,false,true));
 // Monthly rollover retains the last durable counter, never the first new-month value.
 Store monthlyStore;sc::Automation monthly(monthlyStore,1,2,3);p.seq=1;p.scheduleEnabled=false;p.windowCount=0;p.dailyMwh=0;p.extraDailyMwh=0;p.monthlyMwh=1000;p.anchorMwh=0;assert(monthly.apply(p,true));
 const uint64_t nov30=1796079599;assert(monthly.observe(900,3,nov30,true,true));assert(monthly.observe(1100,3,nov30+2,true,true));assert(monthly.state().monthlyBase==900);assert(!monthly.budgetRestricted());
 // A signed new resident scope gets a fresh qualified anchor; same-resident edits do not.
 auto newResident=allowed;newResident.seq=6;newResident.subject[0]=2;newResident.anchorMwh=2800;newResident.dailyMwh=1000;newResident.monthlyMwh=20000;newResident.extraDailyMwh=0;newResident.scheduleEnabled=false;
 assert(!reboot.apply(newResident,false));assert(reboot.apply(newResident,true));assert(!reboot.ready());assert(reboot.observe(2800,3,nextMidnight+300,true,true));assert(!reboot.budgetRestricted());assert(reboot.state().dailyBase==2800);
 std::cout<<"Automation checks passed: durable budgets, period rollover, conservative gaps, weekly windows, epoch/replay, independent restrictions and storage failure.\n";
}
