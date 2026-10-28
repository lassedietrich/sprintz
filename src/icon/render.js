const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:1024}});
const svg=fs.readFileSync('icon.svg','utf8');
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
for(const s of [1024,512,192,180]){ await p.setViewportSize({width:s,height:s}); await p.evaluate(s=>{ const e=document.querySelector('svg'); e.setAttribute('width',s); e.setAttribute('height',s); },s); await p.screenshot({path:`icon-${s}.png`,clip:{x:0,y:0,width:s,height:s}}); }
await b.close(); })();
