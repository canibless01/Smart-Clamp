#pragma once
#include <cstdint>
namespace sc::hardware {
// Reference classic ESP32-WROOM-32 DevKit. This is not the legacy ESP8266 image wiring.
constexpr int Ct1=34,Ct2=35,Voltage=32,Hall=33,PowerFail=39;
constexpr int OpenCoil=25,CloseCoil=26,Feedback=27;
constexpr int ModemRx=16,ModemTx=17,Rs485Rx=18,Rs485Tx=19,Rs485De=21,Led=23;
constexpr unsigned Rs485Baud=9600,ModemBaud=115200;
constexpr unsigned CoilPulseMs=75,CoilCooldownMs=2000;
// false keeps bench builds electrically inert. Activation requires qualified adapter and commissioning.
constexpr bool HardwareQualified=false;
constexpr double VoltsPerAdcCount=0,AmpsPerAdcCount1=0,AmpsPerAdcCount2=0;
constexpr double PhaseCorrectionSamples=0;
constexpr unsigned CalibrationEpoch=0;
// Unknown calibration must never be accepted as a real zero reading.
constexpr bool Calibrated=CalibrationEpoch>0 && VoltsPerAdcCount>0 && AmpsPerAdcCount1>0;
}
