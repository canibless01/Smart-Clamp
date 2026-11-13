#include "latching_driver.hpp"
#include <cassert>
#include <iostream>
struct Pins:sc::CoilIO{
 bool open=false,close=false,known=true,on=false;unsigned pulses=0;
 void coils(bool a,bool b)override{assert(!(a&&b));open=a;close=b;if(a||b)++pulses;}
 bool auxiliary(bool& actual)const override{actual=on;return known;}
};
int main(){
 Pins p;sc::LatchingDriver inert({false,75,2000,1000},p);assert(!inert.request(true)&&p.pulses==0);
 sc::LatchingDriver d({true,75,2000,1000},p);d.tick(0);assert(d.request(true)&&p.close&&!p.open);assert(d.request(true)&&p.pulses==1);assert(!d.request(false));
 d.tick(74);assert(p.close);d.tick(75);assert(!p.open&&!p.close);assert(d.busy());p.on=true;d.tick(80);assert(!d.busy());
 assert(!d.request(false));d.tick(2075);assert(d.request(false)&&p.open&&!p.close);d.tick(2150);assert(!p.open);d.tick(3150);assert(d.faulted());assert(!d.request(true));
 p.on=false;assert(d.acknowledgeFault());d.tick(5150);p.known=false;assert(!d.request(true));assert(d.request(false));d.tick(5225);d.tick(6225);assert(d.faulted());
 p.known=true;assert(d.acknowledgeFault());d.tick(8225);assert(d.request(true));d.tick(1);assert(d.faulted()&&!p.open&&!p.close);
 std::cout<<"Latching driver interlocks, bounded pulse, cooldown, auxiliary feedback, timeout and clock rollback tests passed.\n";
}
