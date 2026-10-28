/* ---- Signalerkennung ohne Vorlage: Pfiff, Klatschen/Schuss, Hupe/Piepton ---- */
// x: Float32Array mono, R: Abtastrate (Hz). Liefert bis zu 6 Kandidaten [{t, score, f}] nach Güte sortiert.
function sigFFT(re, im){ const n=re.length;
  for(let i=1,j=0;i<n;i++){ let b=n>>1; for(;j&b;b>>=1) j^=b; j^=b; if(i<j){ let t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(let len=2;len<=n;len<<=1){ const a=-2*Math.PI/len, wr=Math.cos(a), wi=Math.sin(a);
    for(let i=0;i<n;i+=len){ let cr=1, ci=0; for(let k=0;k<len/2;k++){ const u=i+k, v=u+len/2, tr=re[v]*cr-im[v]*ci, ti=re[v]*ci+im[v]*cr;
      re[v]=re[u]-tr; im[v]=im[u]-ti; re[u]+=tr; im[u]+=ti; const ncr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=ncr; } } } }
function sigDetect(x, R, type){
  const N=256, H=Math.max(1,Math.round(R*0.002)), nF=Math.floor((x.length-N)/H); if(nF<50) return [];
  const df=R/N, bin=f=>Math.max(1,Math.min(N/2-1,Math.round(f/df)));
  const band = type==="whistle" ? [bin(1700), bin(5000)] : type==="tone" ? [bin(300), bin(3000)] : [bin(1500), bin(Math.min(10000,R/2-200))];
  const win=new Float32Array(N); for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
  const Lb=new Float32Array(nF), Lt=new Float32Array(nF), Ton=new Float32Array(nF), Pk=new Float32Array(nF), Sh=new Float32Array(nF);
  const re=new Float32Array(N), im=new Float32Array(N), eps=1e-12;
  for(let f=0;f<nF;f++){ const o=f*H; for(let i=0;i<N;i++){ re[i]=x[o+i]*win[i]; im[i]=0; } sigFFT(re,im);
    let tot=0, eb=0, mx=0, mk=0; for(let k=2;k<N/2;k++){ const p=re[k]*re[k]+im[k]*im[k]; tot+=p; if(k>=band[0]&&k<=band[1]){ eb+=p; if(p>mx){ mx=p; mk=k; } } }
    // Tonhaftigkeit: Energie im Spitzenbereich (±1 Bin) relativ zur Bandenergie
    let pkE=0; if(mk){ for(let k=mk-1;k<=mk+1;k++){ pkE+=re[k]*re[k]+im[k]*im[k]; } }
    Lb[f]=10*Math.log10(eb+eps); Lt[f]=10*Math.log10(tot+eps); Ton[f]= eb>0 ? pkE/eb : 0; Pk[f]=mk*df; Sh[f]= tot>0 ? eb/tot : 0; }
  // Hintergrund: Mittelwert der Pegel 0,6 s bis 0,05 s vor dem Bild (gleitend)
  const a0=Math.round(0.6/(H/R)), a1=Math.round(0.05/(H/R)), bgB=new Float32Array(nF), bgT=new Float32Array(nF);
  { let sB=0, sT=0, n=0; for(let f=0;f<nF;f++){ const add=f-a1, rem=f-a0-1; if(add>=0){ sB+=Lb[add]; sT+=Lt[add]; n++; } if(rem>=0){ sB-=Lb[rem]; sT-=Lt[rem]; n--; }
    bgB[f]= n>0 ? sB/n : Lb[0]; bgT[f]= n>0 ? sT/n : Lt[0]; } }
  const ev=[];
  if(type==="clap"){
    const k=Math.max(1,Math.round(0.006/(H/R)));
    let cur=null;
    for(let f=k;f<nF;f++){ const rise=Lt[f]-bgT[f], fast=Lt[f]-Lt[f-k], ok=rise>14 && fast>8 && Sh[f]>0.15;
      if(ok){ if(!cur) cur={f0:Math.max(0,f-k), f1:f, r:rise, q:fast}; else { cur.f1=f; cur.r=Math.max(cur.r,rise); cur.q=Math.max(cur.q,fast); } }
      else if(cur && f-cur.f1>2){ ev.push({f0:cur.f0, f1:cur.f1, score:cur.r+0.5*cur.q}); cur=null; } }
    if(cur) ev.push({f0:cur.f0, f1:cur.f1, score:cur.r+0.5*cur.q});
  } else {
    const minTon = type==="whistle" ? 0.3 : 0.25, minShare = 0.3, minDur = type==="whistle" ? 0.06 : 0.12;
    let s=-1, gap=0, acc=0, tacc=0, n=0;
    for(let f=0;f<=nF;f++){ const ok = f<nF && Lb[f]-bgB[f]>10 && Ton[f]>minTon && Sh[f]>minShare;
      if(ok){ if(s<0){ s=f; acc=0; tacc=0; n=0; } gap=0; acc+=Lb[f]-bgB[s]; tacc+=Ton[f]; n++; }
      else if(s>=0 && ++gap>4){ const e=f-gap, dur=(e-s+1)*H/R; if(dur>=minDur) ev.push({f0:s, f1:e, score:(acc/n)*(tacc/n)*Math.min(1,dur/0.25)}); s=-1; } }
  }
  // Einsatz genau bestimmen: Hüllkurve im Zeitbereich, erster Punkt über 10 % (Ton) bzw. 25 % (Knall) der Spitze
  const out=ev.map(e=>{
    const c0=Math.max(0, e.f0*H - Math.round(0.03*R)), c1=Math.min(x.length, e.f1*H+N+Math.round(0.08*R));
    let y=x.subarray(c0,c1);
    if(type!=="clap"){ // Bandpass um die Spitzenfrequenz (Biquad, Q≈4)
      let fs=0, cnt=0; for(let f=e.f0; f<=Math.min(e.f1,e.f0+30); f++){ fs+=Pk[f]; cnt++; } const fc=fs/cnt||1000, w0=2*Math.PI*fc/R, al=Math.sin(w0)/(2*4);
      const b0=al, b2=-al, a0n=1+al, a1n=-2*Math.cos(w0), a2n=1-al; const z=new Float32Array(y.length); let x1=0,x2=0,y1=0,y2=0;
      for(let i=0;i<y.length;i++){ const v=(b0*y[i]+b2*x2-a1n*y1-a2n*y2)/a0n; x2=x1; x1=y[i]; y2=y1; y1=v; z[i]=v; } y=z; e.fc=fc;
    } else { const z=new Float32Array(y.length); for(let i=1;i<y.length;i++) z[i]=y[i]-0.95*y[i-1]; y=z; }
    const sm=Math.max(1,Math.round((type==="clap"?0.0005:0.002)*R)), env=new Float32Array(y.length); let acc=0;
    for(let i=0;i<y.length;i++){ acc+=Math.abs(y[i]); if(i>=sm) acc-=Math.abs(y[i-sm]); env[i]=acc/sm; }
    // Spitze in den ersten 120 ms nach dem groben Einsatz, Grundrauschen davor
    const pre=Math.round(0.025*R); let nb=0; for(let i=0;i<Math.min(pre,env.length);i++) nb+=env[i]; nb/=Math.max(1,Math.min(pre,env.length));
    const lim=Math.min(env.length, pre+Math.round(0.12*R)); let pk=0, pi=pre; for(let i=pre;i<lim;i++) if(env[i]>pk){ pk=env[i]; pi=i; }
    const thr = nb + (pk-nb)*(type==="clap"?0.25:0.1); let on=pi; while(on>0 && env[on-1]>=thr) on--;
    // Glättung verschiebt den Einsatz um die halbe Fensterlänge nach hinten: korrigieren
    const t=(c0+on-sm/2)/R;
    return {t:Math.max(0,t), score:e.score, f:e.fc||null};
  });
  out.sort((a,b)=>b.score-a.score);
  const sel=[]; for(const c of out){ if(sel.every(s=>Math.abs(s.t-c.t)>0.4)) sel.push(c); if(sel.length>=6) break; }
  const top=sel.length?sel[0].score:1; sel.forEach(c=>c.q=Math.max(0,Math.min(1,c.score/top)));
  return sel;
}
if(typeof module!=="undefined") module.exports={sigDetect};
