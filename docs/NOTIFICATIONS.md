# Notification and support contract
All templates use measured/confirmed facts and source timestamp. Locale initially English; keys and parameter interpolation permit later translations. SMS cost/billing failure must not break in-app event recording. Delivery states queued/sent/provider_accepted/delivered/failed/unknown; accepted != read. In-app is durable record, push is a prompt, SMS fallback only if configured. Unique(episode_id,recipient,template,channel); retry same message ID to prevent duplicates. Provider callbacks signature-verified/idempotent. Customer opt-out applies optional channels; critical visible in-app facts remain. Provider inability yields ops delivery ticket.

| Key | Trigger | Audience | Example / resolution |
|---|---|---|---|
| supply.lost | confirmed source episode | affected customers; landlord; scoped utility aggregate; ops | “Supply interruption detected at {time}. Your last reading was {time}. Updates may be delayed.” |
| supply.restored | source recovery confirmed | same episode subscribers | “Supply detected again at {time}. Device protection may delay reconnection.” |
| voltage.unsafe | qualified invalid operating voltage | device owner, assigned building ops | “Voltage {v}V outside configured range. {power cut confirmed / alert only / state unknown}.” |
| voltage.stable | 5min stable | owner | “Voltage stable. {Restore Power available / auto-restore pending / other OFF reason}.” |
| overload.detected / cleared | configured sustained condition | owner | “High load detected: {watts}W. Check connected appliances.” No assertion of certified fire protection. |
| balance.low | threshold crossing | room owner/payer opt-in | “Room balance {units}kWh. Recharge if needed.” |
| balance.zero | ledger zero crossing | room owner | “Balance exhausted. {cutoff pending/confirmed/unavailable}.” |
| payment.confirmed | verified money receipt | payer | “Payment ₦{amount} received. {units}kWh {pending vending/credited}.” |
| vending.failed | provider failure after paid | payer + finance ticket | “Payment received; meter top-up delayed. Reference {ref}. Do not pay again while we reconcile.” |
| control.applied | physical feedback ACK | requester/affected owner | “Power {on/off} confirmed for {device} at {time}. Reason: {reason}.” |
| control.rejected | device/server rejection | requester | “Action not applied: {safe_reason}. Current state {observed/unknown}.” |
| device.offline | >=24h unexplained | owner/assigned ops | “No confirmed contact since {time}. This may be connectivity or power loss.” |
| tamper.suspected | correlated evidence | affected owner/private ops | “Measurement mismatch needs review. This is not a confirmed theft finding.” |
| utility.broadcast | authorized approved region broadcast | scoped opted-in audience | named sender, issued_at and message text; untrusted content escaped |
| subscription.failed | failed recurring payment | subscriber | grace date; explicitly “This does not disconnect electricity.” |
| report.ready | scheduled/requested immutable report | authorized owner | scoped expiring link, no private data in push body |
| account.inactive | no login30days | opted-in account | one reminder, not indication device idle |
| maintenance.notice | approved scheduled maintenance | affected occupants | reason, intended window and contact; feedback update on completion |

Support tickets: id, reporter, scope/device, category, priority, linked episode/payment/command, assigned team, opened_at, response_due_at, status(open/triaged/waiting_customer/waiting_provider/resolved/reopened), append-only conversation and private attachments. Targets proposed: electrical hazard immediate instruction to contact qualified local service; platform critical alert acknowledgement15min during staffed coverage, payment failure1business day, general2business days. Do not advertise round-the-clock response without staffing. Escalation is a workflow event, never a relay action. Signed attachment URLs expire15min; validate MIME/size and malware scan before evidence access.

USSD: authenticate aggregator callback; bind sessionId+phone; replay-safe continuation; server-controlled menu1 Buy Units,2 Check Balance (entitlement),3 Help. Resolve entered public ID to minimal quote, no owner's PII. Provider-hosted PIN/checkout only; never collect bank PIN in app/firmware. SMS commands for relay actuation are not supported. Balance replies require caller authorization or deliberate public balance publication policy. Rate-limit phone/device separately.
