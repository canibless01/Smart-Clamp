# Domain defaults and invariants
These are foundation decisions unless noted as source values. Persist configuration version with affected event. Devices cannot override tariffs, roles, entitlements or consent.

| Parameter | Default / rule |
|---|---|
| sensing / reporting / heartbeat | acquisition adapter must validate sample rate; aggregate 1s; upload 60s; heartbeat 60s |
| stale / offline | 180s stale, 24h offline notification (24h source requirement) |
| supply_lost / returned | valid voltage <50V for 3s / >=50V for 10s; distinct from acceptable operating voltage |
| voltage protection | source <180V or >250V; 5min continuously stable restore; explicit auto-restore off by default |
| overload | source >2000W monitoring threshold; 10s debounce; not universal breaker rating; physical cutoff limit supplied by qualified circuit configuration, never inferred from this marketing value |
| correlation | 5min matched intervals, >=95% coverage; three consecutive eligible windows; 5/8/10% source threshold classes |
| command life | 120s maximum, online manual request; no execute at/after expiry |
| manual control cooldown | 2s between coil pulses; min/max pulse 50–100ms only for reference-class relay, actual driver qualification required |
| safety vs plans | protection always active on qualified relay hardware; predictive fire/shock claims remain research, not life-safety guarantees |
| reporting values | power signed watts, import/export separate Wh counters, monotonic sequence/boot epoch, units in each field |
| time | UTC milliseconds for telemetry; UTC seconds for commands; IANA zone for schedules; avoid ambiguous local timestamps |
| financial precision | kobo bigint, energy integer mWh (ledger) or decimal kWh(18,6); no float money; round half-up once per invoice line |
| tariff | immutable rate version, validity interval, day/night interval; reject overlap; crossing tariff split by measured subintervals |
| auto-recharge | off; opted-in mandate/cap/threshold; one in-flight request; no device-stored bank PIN; provider failure visible |
| payment retries | durable exponential backoff with jitter, base5s cap15min; dead letter after24h; provider nonretryable errors immediately reviewed |
| sensitive control auth | step-up 5min bound to operation hash/device scope; one-use verification challenge, 5 attempts, 60s resend cooldown |
| public/report access | opaque >=128-bit token; revoke/expiry; no PII; rate limit; no search indexing |
| subscription grace | 7 days, then limited app features; electricity remains separately governed |
| notification quiet hours | promotional/low priority held 21:00–07:00 Lagos; critical safety/outage events bypass quiet hours |
| retention | raw telemetry 24 months proposed; financial/audit 7 years proposed pending counsel; anonymized aggregates afterward; never promise final regulatory compliance without review |

Financial invariants: every journal transaction balances debits and credits in one denomination; gateway event unique by(provider,reference,event_kind); partial refunds explicit; no transaction deletion; reconciled payment/vending/credit statuses tracked separately; unknown provider outcome reconciled before retrying a charge. Bill credit estimates are claims, never automatically money owed by utility. Benchmark minimum cohort5; suppress smaller samples. Predictions show model/version/confidence and cannot actuate hardware.

State authority: physical relay feedback > device receipt > requested server state. Grid presence is independent of connectivity and relay. A gateway cannot create child meter values. Server identity/permissions are authoritative for access; local safety can refuse a server ON. Measurement gaps lower confidence and stop verification, not default to zero. Restore and switching need electrical qualification in addition to this software policy.
