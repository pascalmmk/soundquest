"use client";
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Maximize2, Minimize2, PanelTop, Move, X } from 'lucide-react';

type Props = { id:string; title:string; number:string; icon:ReactNode; open:boolean; onClose:()=>void; resetKey:number; children:ReactNode };

export function StudioWindow({id,title,number,icon,open,onClose,resetKey,children}:Props){
 const [floating,setFloating]=useState(false),[expanded,setExpanded]=useState(false),[position,setPosition]=useState({x:80,y:120}),[z,setZ]=useState(30);
 function focusWindow(){window.dispatchEvent(new CustomEvent('soundquest:window-focus',{detail:id}))}
 useEffect(()=>{const focus=(e:Event)=>setZ((e as CustomEvent).detail===id?45:30);window.addEventListener('soundquest:window-focus',focus);return()=>window.removeEventListener('soundquest:window-focus',focus)},[id]);
 const element=useRef<HTMLElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{setFloating(false);setExpanded(false);if(element.current){element.current.style.width='';element.current.style.height='';}},[resetKey]);
 useEffect(()=>{
  if(!open){setExpanded(false);return}
  if(id==='transitions'||id==='integration'){
   if(window.matchMedia('(min-width:901px)').matches){setFloating(true);setPosition({x:Math.max(12,(innerWidth-510)/2),y:Math.max(90,(innerHeight-470)/2)});focusWindow()}
   else element.current?.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
 },[open,id]);
 useEffect(()=>{if(!expanded)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setExpanded(false);element.current?.querySelector<HTMLButtonElement>('[data-expand]')?.focus()}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[expanded]);
 function detach(){setExpanded(false);if(!floating){const box=element.current?.getBoundingClientRect();setPosition({x:Math.max(12,Math.min(box?.left||80,innerWidth-Math.min(id==='mixer'?800:510,innerWidth-24)-12)),y:Math.max(84,Math.min(box?.top||120,innerHeight-280))});}else if(element.current){element.current.style.width='';element.current.style.height='';}setFloating(!floating);focusWindow()}
 function begin(e:PointerEvent<HTMLElement>){if(!floating||expanded||(e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:position.x,top:position.y};focusWindow()}
 function move(e:PointerEvent<HTMLElement>){if(!drag.current)return;const d=drag.current;setPosition({x:Math.max(8,Math.min(innerWidth-(element.current?.offsetWidth||400)-8,d.left+e.clientX-d.x)),y:Math.max(76,Math.min(innerHeight-300,d.top+e.clientY-d.y))})}
 return <section ref={element} hidden={!open} aria-labelledby={`${id}-title`} id={`window-${id}`} className={`studio-window window-${id} ${floating?'is-floating':''} ${expanded?'is-expanded':''}`} style={floating&&!expanded?{left:position.x,top:position.y,maxHeight:`calc(100dvh - ${position.y+110}px)`,zIndex:z}:expanded?{zIndex:z}:undefined} onPointerDownCapture={()=>{if(floating||expanded)focusWindow()}}>
  <header className="window-chrome" onPointerDown={begin} onPointerMove={move} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
   <div className="window-identity"><span className="window-number">{number}</span>{icon}<h2 id={`${id}-title`}>{title}</h2>{floating&&!expanded&&<Move size={13} className="move-indicator"/>}</div>
   <div className="window-actions"><button className="float-action" onClick={detach} aria-label={`${floating?'Dock':'Detach'} ${title} window`} title={floating?'Dock in workspace':'Detach and drag by title bar'}><PanelTop size={15}/></button><button data-expand onClick={()=>{setExpanded(!expanded);focusWindow()}} aria-label={`${expanded?'Restore':'Expand'} ${title} window`} title={expanded?'Restore size (Esc)':'Expand window'}>{expanded?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button><button className="close-window" onClick={onClose} aria-label={`Close ${title} window`} title="Close window"><X size={16}/></button></div>
  </header><div className="window-body">{children}</div>
 </section>
}

