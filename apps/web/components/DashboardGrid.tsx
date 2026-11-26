"use client";
import {motion,MotionConfig} from 'framer-motion';
import type {ReactNode,HTMLAttributes} from 'react';
export type TileSize='S'|'M'|'L'|'XL'|'wide'|'tall';
export default function DashboardGrid({children,className='',...props}:HTMLAttributes<HTMLDivElement>){return <MotionConfig reducedMotion="user"><div {...props} className={'dashboard-grid '+className}>{children}</div></MotionConfig>;}
export function DashboardTile({children,size='M',tone='light',className='',label}:{children:ReactNode;size?:TileSize;tone?:'light'|'instrument';className?:string;label?:string}){return <motion.section initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.18}} className={`dashboard-tile tile-${size} ${tone==='instrument'?'instrument-tile':''} ${className}`} aria-label={label}>{children}</motion.section>;}
