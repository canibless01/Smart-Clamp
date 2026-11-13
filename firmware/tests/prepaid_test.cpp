#include "prepaid_policy.hpp"
#include <cassert>
#include <iostream>
struct Store:sc::CreditStore{
 sc::CreditState saved{};bool ok=true;unsigned writes=0;
 bool load(sc::CreditState& s)override{s=saved;return ok;}
 bool persist(const sc::CreditState& s)override{if(!ok)return false;saved=s;++writes;return true;}
};
int main(){
 Store storage;sc::PrepaidPolicy device(storage,1,7,3);assert(device.restricted());
 sc::CreditPolicy policy{1,5000100,100,1,7,3};assert(!device.apply(policy,false));assert(device.apply(policy,true));
 assert(device.restricted());assert(device.observeCounter(100,3,true));assert(!device.restricted()&&device.remainingMwh()==5000000);
 assert(device.reasons(sc::Unsafe|sc::Manual|sc::WalletZero)==(sc::Unsafe|sc::Manual));
 assert(device.observeCounter(5000100,3,true)&&device.restricted());assert(device.reasons(sc::Unsafe|sc::Manual)==(sc::Unsafe|sc::Manual|sc::WalletZero));
 // A signed recharge extends only volume; unrelated protection/manual reasons survive.
 auto recharge=policy;recharge.seq=2;recharge.ceilingMwh=10000100;assert(device.apply(recharge,true));assert(!device.restricted());assert(device.reasons(sc::Unsafe|sc::Maintenance|sc::WalletZero)==(sc::Unsafe|sc::Maintenance));
 assert(!device.apply(policy,true));auto conflict=recharge;conflict.ceilingMwh++;assert(!device.apply(conflict,true));
 sc::PrepaidPolicy reboot(storage,1,7,3);assert(reboot.restricted());assert(reboot.observeCounter(5000100,3,true)&&reboot.remainingMwh()==5000000);assert(!reboot.observeCounter(0,3,true)&&reboot.restricted());assert(!reboot.observeCounter(6000000,4,true));
 assert(reboot.recover()&&reboot.observeCounter(5000100,3,true));
 storage.ok=false;assert(!reboot.observeCounter(6000000,3,true)&&reboot.restricted());assert(storage.saved.importMwh==5000100);
 storage.ok=true;assert(reboot.recover()&&reboot.restricted());assert(reboot.observeCounter(5000100,3,true)&&reboot.remainingMwh()==5000000);
 sc::PrepaidPolicy wrongEpoch(storage,1,8,3);assert(wrongEpoch.restricted());
 std::cout<<"Durable prepaid allowances, exact cutoff, recharge isolation, replay, epoch/reset and storage-failure tests passed. No physical relay proof implied.\n";
}
