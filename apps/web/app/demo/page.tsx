import type {Metadata} from 'next';
import InvestorDemo from '@/components/InvestorDemo';
export const metadata:Metadata={title:'SmartClamp investor demo',robots:{index:false,follow:false}};
export default function Page(){return <InvestorDemo/>;}
