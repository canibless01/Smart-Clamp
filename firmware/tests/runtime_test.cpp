#include "runtime.hpp"
#include <vector>
#include <cassert>
#include <iostream>
struct Store:sc::Journal {
 std::vector<sc::Event> events;uint64_t seq=0,last=0;bool ok=true;
 bool append(sc::Event& e)override{if(!ok)return false;e.sequence=++seq;events.push_back(e);return true;}
 bool acknowledge(uint64_t s)override{if(s>seq)return false;return true;}
 bool persistCommand(uint64_t n,uint32_t)override{if(!ok)return false;last=n;return true;}
 uint64_t lastCommand()const override{return last;}
};
struct Relay:sc::Actuator {
 bool on=true,known=true,ready=true;unsigned pulses=0;
 bool commissioned()const override{return ready;}
 bool feedback(bool& v)const override{v=on;return known;}
 bool request(bool v)override{on=v;++pulses;return true;}
};
int main(){
 using namespace sc;Store s;Relay a;RuntimeConfig cfg;cfg.relay=true;cfg.autoRestore=true;Runtime rt(cfg,s,a);
 a.on=false;Measurement startup;startup.valid=true;startup.volts=230;rt.sample(startup,0);assert(!a.on);rt.recoverIntent(0);a.on=true;
 Measurement m;m.valid=true;m.volts=230;rt.sample(m,0);rt.sample(m,10000);assert(rt.supply()==Supply::Present);
 m.volts=0;rt.sample(m,11000);assert(!a.on);rt.sample(m,14000);assert(rt.supply()==Supply::Absent);
 m.volts=230;rt.sample(m,20000);rt.sample(m,30000);assert(rt.supply()==Supply::Present);assert(!a.on);
 rt.setReason(WalletZero,true);rt.sample(m,320000);assert(!a.on);assert(!(rt.reasons()&Unsafe));
 rt.setReason(WalletZero,false);assert(rt.reconcile()&&a.on);
 Command off{1,100,120,false};assert(rt.command(off,110,true,true,true).allowed);assert(!a.on);
 auto pulses=a.pulses;assert(!rt.command(off,110,true,true,true).allowed);assert(a.pulses==pulses);
 Command on{2,100,120,true};rt.setReason(Budget,true);assert(!rt.command(on,110,true,true,true).allowed);assert(!a.on);
 rt.setReason(Budget,false);assert(rt.reconcile()&&a.on);
 a.known=false;Command bad{3,100,120,false};assert(!rt.command(bad,110,true,true,true).allowed);assert(s.last==2);
 a.known=true;s.ok=false;assert(!rt.command(bad,110,true,true,true).allowed);assert(a.on);
 m.volts=260;rt.sample(m,400000);assert(!a.on);assert(!rt.healthyStorage());
 m.volts=230;rt.sample(m,410000);rt.sample(m,710000);assert(!a.on);
 std::cout<<"Runtime outage/recovery, independent OFF reasons, feedback, replay and durable-storage failure checks passed.\n";
}
