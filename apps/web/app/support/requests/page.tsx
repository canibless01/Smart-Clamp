"use client";
import {useState} from "react";
import Link from "next/link";
import RecordWorkspace from "@/components/RecordWorkspace";
export default function Page() {
  const [offset,setOffset]=useState(0);
  return <RecordWorkspace title="Support requests" description="Your saved requests, or the support queue for authorised staff." endpoint={`/support/tickets?offset=${offset}`}>
    {(data) => <><div className="resource-list">{data.items.length ? data.items.map((ticket: any) => <article className="card" key={ticket.id}>
      <h2><Link className="text-link" href={`/support/tickets/${ticket.id}`}>{ticket.subject}</Link></h2>
      <p>{ticket.category} · {ticket.status.replaceAll("_", " ")}</p>
      <time>{new Date(ticket.opened_at).toLocaleString()}</time>
    </article>) : <p>No support requests yet. <Link className="text-link" href="/support">Open a request</Link></p>}</div><div className="resource-actions">{offset>0 && <button className="btn btn-secondary" onClick={()=>setOffset(Math.max(0,offset-50))}>Previous requests</button>}{data.next_cursor && <button className="btn btn-secondary" onClick={()=>setOffset(Number(data.next_cursor))}>More requests</button>}</div></>}
  </RecordWorkspace>;
}
