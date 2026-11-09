#include "core.hpp"
#include <cassert>
#include <limits>
#include <iostream>
int main(){
 using namespace sc;
 assert(capabilities(Role::BuildingHub).currentChannels==0);
 assert(capabilities(Role::PoleGateway).gsm && !capabilities(Role::PoleDevice).gsm);
 assert(capabilities(Role::HouseFull).relayRequired);
 assert(!capabilities(Role::Transformer).relayOptional);
 double v[]={1,-1,1,-1}, i[]={2,-2,2,-2};
 auto m=measure(v,i,4);assert(m.valid && m.watts==2 && m.powerFactor==1);
 double reactive[]={2,2,-2,-2};auto q=measure(v,reactive,4);assert(q.valid && q.watts==0 && q.apparentVA==2);
 assert(!measure(v,i,0).valid);double bad[]={std::numeric_limits<double>::quiet_NaN()};assert(!measure(bad,bad,1).valid);
 Energy e;assert(e.add(m,1));assert(std::abs(e.kwh()-2.0/3600000)<1e-12);assert(!e.add(m,60));assert(!e.add(m,-1));
 Protection p;assert(!p.update(true,179,0).allowed);assert(!p.update(true,251,0).allowed);
 assert(p.update(true,230,10).allowed);assert(!p.restoreReady(300009));assert(p.restoreReady(300010));
 assert(!p.update(false,230,300011).allowed);assert(!p.restoreReady(600011));
 assert(p.update(true,180,600012).allowed);assert(p.update(true,250,600013).allowed);
 Command c{2,100,120,true};assert(authorize(c,110,1,true,true,true).allowed);
 assert(!authorize(c,110,2,true,true,true).allowed);assert(!authorize(c,120,1,true,true,true).allowed);
 assert(!authorize(c,99,1,true,true,true).allowed);assert(!authorize(c,110,1,false,true,true).allowed);
 assert(!authorize(c,110,1,true,false,true).allowed);assert(!authorize(c,110,1,true,true,false).allowed);
 RelayPolicy relay;assert(!relay.request(true,true,true).allowed);
 relay.commission(true,true,false);assert(!relay.request(true,false,true).allowed);
 assert(!relay.request(true,true,false).allowed);assert(relay.request(false,false,true).allowed);
 assert(relay.request(true,true,true).allowed);assert(!relay.observedOn());relay.observe(true,true);assert(relay.observedOn());
 std::cout<<"Core policy checks passed: capabilities, real power, energy gaps, protection, expiry/replay and relay commissioning.\n";
}
