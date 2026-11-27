"use client";
import RecordWorkspace from '@/components/RecordWorkspace';
import AutomationSettings from '@/components/AutomationSettings';
export default function Page({params:{id}}:{params:{id:string}}){return <RecordWorkspace title="Budgets & schedules" description="Configure your own qualified device. Configuration receipts and physical relay feedback are separate." endpoint={`/devices/${id}`}>{()=> <AutomationSettings key={id} deviceId={id}/>}</RecordWorkspace>;}
