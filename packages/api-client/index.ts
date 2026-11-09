// Minimal typed client wrapper around canonical OpenAPI
// Generate full client via: npm run generate (requires openapi-generator-cli)
// This stub provides typed helpers for key loops L01-L15

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v1'

export type QuoteRequest = { destination_token: string, amount_kobo: number, utility_type: 'electricity'|'water'|'gas' }
export type Quote = { id:string, expires_at:string, amount_kobo:number, wallet_value_kobo:number, markup_kobo:number, fee_kobo:number, units_mwh:number, tariff_version:string }
export type PaymentStatus = { id:string, payment_state:string, vending_state:string, credit_state:string, amount_kobo:number, units_mwh:number }

export async function createQuote(req: QuoteRequest, idempotencyKey:string): Promise<Quote>{
  const r=await fetch(`${API_BASE}/payments/quotes`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify(req)})
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
export async function checkout(quote_id:string, return_path:string, idempotencyKey:string){
  const r=await fetch(`${API_BASE}/payments/checkout`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({quote_id,return_path})})
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
export async function getPayment(payment_id:string, token:string):Promise<PaymentStatus>{
  const r=await fetch(`${API_BASE}/payments/${payment_id}`,{headers:{Authorization:`Bearer ${token}`}})
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
export type DeviceEnvelope = { device_id:string, key_epoch:number, payload_b64:string, signature:string }
export async function postDeviceEvent(envelope:DeviceEnvelope){
  const r=await fetch(`${API_BASE}/device/events`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`dev-${Date.now()}`},body:JSON.stringify(envelope)})
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
