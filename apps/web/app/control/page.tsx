"use client";
import RecordWorkspace from "@/components/RecordWorkspace";
import PowerControlPanel from "@/components/PowerControlPanel";
export default function Page(){return <RecordWorkspace title="Power control" description="Control your own relay-equipped SmartClamp. Device feedback confirms physical changes; supply and local restrictions remain separate." endpoint="/users/me/context">{data=><PowerControlPanel context={data}/>}</RecordWorkspace>;}
