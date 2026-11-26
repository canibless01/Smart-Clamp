"use client";
import React,{Children,isValidElement,cloneElement,type ReactNode,type LabelHTMLAttributes} from 'react';
export default function FormCheckRow({children,className='',...props}:LabelHTMLAttributes<HTMLLabelElement>){
 let control:ReactNode=null;
 function split(nodes:ReactNode):ReactNode{return Children.map(nodes,child=>{if(!isValidElement(child))return child;const p=child.props as any;if(child.type==='input'&&['checkbox','radio'].includes(p.type)){if(!control)control=child;return null;}return p.children?cloneElement(child as React.ReactElement<any>,{},split(p.children)):child;});}
 const content=split(children);return <label {...props} className={'form-check-row '+className}>{control}<span className="form-check-content">{content}</span></label>;
}
