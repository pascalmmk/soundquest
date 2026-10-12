/** SoundQuest browser SDK v1. No dependencies. Call start from a user gesture. */
export class SoundQuest {
 constructor(){this.context=null;this.buffers=new Map();this.nodes=[];this.running=false;this.config=null;this.state='exploration';this.pending=null;this.level=0.65;this.epoch=0;}
 ensure(){if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.level;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.ratio.value=12;this.master.connect(limiter);limiter.connect(this.context.destination);}return this.context;}
 async decode(bytes){return this.ensure().decodeAudioData(bytes);}
 async load(config){const ctx=this.ensure();for(const stem of config.stems){if(!this.buffers.has(stem.id)){if(stem.demo!==undefined)this.buffers.set(stem.id,makeDemo(ctx,stem.demo));else{const r=await fetch(stem.url);if(!r.ok)throw Error('Could not load '+stem.name);this.buffers.set(stem.id,await ctx.decodeAudioData(await r.arrayBuffer()));}}}const lengths=config.stems.map(s=>this.buffers.get(s.id).duration);if(lengths.some(n=>Math.abs(n-lengths[0])>.05))throw Error('All stems must have the same loop length.');}
 async start(config,state='exploration'){this.stop();const ctx=this.ensure();await ctx.resume();if(!config.stems.length)throw Error('Add at least one stem.');this.config=config;this.state=state;this.epoch=ctx.currentTime+.08;for(const stem of config.stems){const buffer=this.buffers.get(stem.id);if(!buffer)throw Error('Call load(config) before start.');const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const gain=ctx.createGain();gain.gain.value=(stem.levels[state]||0)/100;source.connect(gain);gain.connect(this.master);source.start(this.epoch);this.nodes.push({id:stem.id,source,gain});}this.running=true;}
 position(){return this.running?Math.max(0,(this.context.currentTime-this.epoch)*this.config.bpm/60):0;}
 currentState(){if(this.pending&&this.context.currentTime>=this.pending.at){this.state=this.pending.state;this.pending=null;}return this.state;}
 configure(config,state){this.config=config;this.setState(state);}
 setState(state){if(!['exploration','danger','combat'].includes(state))throw Error('Unknown soundtrack state');if(!this.running){this.state=state;return;}const now=this.context.currentTime;this.currentState();const changed=state!==(this.pending?.state||this.state);const beat=60/this.config.bpm;let at=now+.015;if(changed){at=this.epoch+(Math.floor((now-this.epoch)/(beat*this.config.quantize))+1)*beat*this.config.quantize;this.pending={state,at};}else if(this.pending)at=this.pending.at;const fade=this.config.fade*beat;for(const n of this.nodes){const stem=this.config.stems.find(s=>s.id===n.id);const param=n.gain.gain;param.cancelAndHoldAtTime(now);param.setValueAtTime(param.value,at);param.linearRampToValueAtTime((stem?.levels[state]||0)/100,at+Math.max(.015,fade));}}
 volume(value){this.level=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.level,this.context.currentTime,.03);}
 stop(){for(const n of this.nodes){try{n.source.stop();}catch{}n.source.disconnect();n.gain.disconnect();}this.nodes=[];this.running=false;this.pending=null;}
 dispose(){this.stop();this.context?.close();}
}
export function peaks(buffer){if(!buffer)return [];const data=buffer.getChannelData(0),out=[];for(let i=0;i<96;i++){let peak=0;for(let j=Math.floor(i*data.length/96);j<(i+1)*data.length/96;j+=8)peak=Math.max(peak,Math.abs(data[j]||0));out.push(peak);}const max=Math.max(...out,.001);return out.map(n=>n/max*.9);}
/** Original eight-bar stealth/electronic cue, 120 BPM. No sampled recordings. */
export function makeDemo(ctx,kind){
 const rate=22050,duration=16,length=rate*duration,buffer=ctx.createBuffer(2,length,rate);
 const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
 let seed=1709+kind*137;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const tau=Math.PI*2,midi=n=>440*2**((n-69)/12);
 // Wrap event tails into the beginning so every stem loops continuously.
 function event(start,seconds,pan,synth){
  const l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2),offset=Math.round(start*rate);
  for(let j=0;j<seconds*rate;j++){const v=synth(j/rate,j),at=(offset+j)%length;left[at]+=v*l;right[at]+=v*r;}
 }
 for(let bar=0;bar<8;bar++){
  const base=bar*2,root=[38,38,38,41,38,38,36,37][bar];
  if(kind===0){
   // Dark, slowly breathing suspended chords and distant metallic echoes.
   const chord=[root+12,root+19,root+26];
   event(base,3.8,bar%2?.35:-.35,t=>{
    const env=Math.sin(Math.PI*Math.min(t/3.8,1))**2;
    return chord.reduce((v,n,k)=>v+Math.sin(tau*midi(n)*t+.35*Math.sin(tau*.23*t+k)),0)*env*.038;
   });
   if(bar%2===0)for(let echo=0;echo<4;echo++)event(base+1.375+echo*.375,1.2,echo%2?.7:-.7,t=>Math.sin(tau*587.33*t+1.8*Math.sin(tau*823.7*t)*Math.exp(-t*18))*Math.exp(-t*6)*Math.min(1,t/.008)*.075*.55**echo);
  }
  if(kind===1){
   // A sparse, syncopated sub-bass phrase with a restrained saturated edge.
   const phrase=bar%2?[[0,0,.28],[.625,0,.18],[1,7,.2],[1.375,-2,.3],[1.875,0,.12]]:[[0,0,.38],[.75,0,.18],[1.25,3,.25],[1.75,0,.16]];
   for(const [at,n,len] of phrase){const f=midi(root-12+n);event(base+at,len,0,t=>{
    const env=Math.min(1,t/.007)*Math.min(1,(len-t)/.04)*Math.exp(-t*2);
    return Math.tanh((Math.sin(tau*f*t)+.32*Math.sin(tau*f*2*t)+.12*Math.sin(tau*f*3*t))*1.6)*env*.28;
   });}
  }
  if(kind===2){
   // Dry mechanical ticks, irregular accents, and a small descending motif.
   for(let step=0;step<16;step++){
    if([2,5,7,10,13,15].includes(step)){
     const at=base+step*.125+(step%2?.014:0),f=midi(root+24+[0,7,10,5][Math.floor(step/4)]);
     event(at,.19,step%3===0?-.65:.55,t=>(Math.sin(tau*f*t+2.4*Math.sin(tau*f*1.99*t)*Math.exp(-t*35))*.075+noise()*.025)*Math.exp(-t*28)*Math.min(1,t/.002));
    }
   }
  }
  if(kind===3){
   // Broken-beat drums: weighted kicks, short snares, shuffled closed hats.
   for(const at of (bar%2?[0,.875,1.5,1.875]:[0,.75,1.375]))event(base+at,.38,0,t=>(Math.sin(tau*(43*t+2.6*(1-Math.exp(-t*38))))*Math.exp(-t*15)+noise()*.08*Math.exp(-t*140))*.46*Math.min(1,t/.001));
   for(const at of [.5,1.5])event(base+at,.24,.08,t=>(noise()*.23*Math.exp(-t*25)+Math.sin(tau*178*t)*.12*Math.exp(-t*32))*Math.min(1,t/.001));
   let previous=0;
   for(let step=0;step<16;step++)if(step%4!==0)event(base+step*.125+(step%2?.018:0),.065,step%2?-.42:.42,t=>{const n=noise(),hp=n-previous;previous=n;return hp*Math.exp(-t*85)*(step%2?.028:.047)*Math.min(1,t/.001);});
   if(bar===3||bar===7)for(const at of [1.6875,1.8125,1.9375])event(base+at,.075,-.3,t=>noise()*Math.exp(-t*65)*.065);
  }
 }
 // Conservative headroom; all four stems can safely play together.
 for(let i=0;i<length;i++){left[i]=Math.tanh(left[i]);right[i]=Math.tanh(right[i]);}
 return buffer;
}
