import {metadataPalette} from "@/lib/design-tokens";
import { ImageResponse } from 'next/og';
export const runtime='edge';
export async function GET(_request: Request,{params}:{params:{size:string}}) {
  const size=Number(params.size);if(![192,512].includes(size))return new Response('Not found',{status:404});
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:metadataPalette.brand,color:metadataPalette.onBrand,fontFamily:'sans-serif',fontWeight:700,fontSize:size*metadataPalette.iconLetterRatio}}>S</div>,{width:size,height:size,headers:{'Cache-Control':'public, max-age=86400'}});
}
