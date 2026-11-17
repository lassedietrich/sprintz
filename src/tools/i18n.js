// Übersetzungen prüfen und zusammenführen: alle L("de","en")-Texte aus src/template.html lesen,
// mit src/i18n/t*.json abgleichen, fehlende melden und src/i18n/table.json neu schreiben.
// Aufruf (im Ordner src): node tools/i18n.js
const fs=require('fs'), path=require('path'), acorn=require('acorn');
const SRC=path.join(__dirname,'..'), tpl=fs.readFileSync(path.join(SRC,'template.html'),'utf8');
const js=[...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
const ast=acorn.parse(js,{ecmaVersion:'latest'}), keys=new Map();
const str=n=>{ if(n.type==='Literal'&&typeof n.value==='string') return n.value; if(n.type==='TemplateLiteral'){ let s=''; n.quasis.forEach((q,i)=>{ s+=q.value.cooked; if(i<n.expressions.length) s+='{'+i+'}'; }); return s; } return null; };
(function walk(n){ if(!n||typeof n.type!=='string') return;
  if(n.type==='CallExpression'&&n.callee.type==='Identifier'){ const A=n.arguments.map(str);
    if(n.callee.name==='L'&&A.length===2&&A[1]!=null) keys.set(A[1],A[0]);
    if(['t','n'].includes(n.callee.name)) [[1,2],[3,4]].forEach(([a,b])=>{ if(A[a]!=null&&A[b]!=null) keys.set(A[b],A[a]); }); }
  for(const k in n){ const v=n[k]; if(Array.isArray(v)) v.forEach(walk); else if(v&&typeof v.type==='string') walk(v); } })(ast);
const D=JSON.parse(js.match(/const DICT = (\{[\s\S]*?\});\n/)[1]); for(const [de,en] of Object.entries(D)) if(!keys.has(en)) keys.set(en,de);
const K1=JSON.parse(fs.readFileSync(path.join(SRC,'i18n/keys_v1.json'),'utf8')), T={};
fs.readdirSync(path.join(SRC,'i18n')).filter(f=>/^t\d+\.json$/.test(f)).sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1)))
  .forEach(f=>JSON.parse(fs.readFileSync(path.join(SRC,'i18n',f),'utf8')).forEach(r=>{ const en=typeof r[0]==='number'?K1[r[0]].en:r[0]; T[en]=r.slice(1,4); }));
const miss=[...keys.keys()].filter(en=>!T[en]);
fs.writeFileSync(path.join(SRC,'i18n/table.json'),JSON.stringify(T));
if(miss.length){ console.log(`Fehlende Übersetzungen (${miss.length}) – in eine neue Datei src/i18n/tNN.json eintragen als ["English","Türkçe","Русский","Nederlands"]:`); miss.forEach(m=>console.log(' '+JSON.stringify(m))); process.exitCode=1; }
else console.log(`Alle ${keys.size} Texte übersetzt.`);
// Weitere Sprachen: src/i18n/lang/<code>.json = {"English": "Übersetzung"}. Sie werden erst beim Veröffentlichen erzeugt.
// node tools/i18n.js --neu  → zeigt je Sprache, was fehlt, und schreibt src/i18n/todo/<code>.json (englischer und deutscher Text)
const NEU=["fr","es","it","pl","cs","da","nb","sv","ro","hr","sr","sq","uk","ku","ar"], LD=path.join(SRC,'i18n/lang'), X={};
if(!fs.existsSync(LD)) fs.mkdirSync(LD);
NEU.forEach(l=>{ const f=path.join(LD,l+'.json'); const t=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{}; const used={}; for(const en of keys.keys()) if(t[en]) used[en]=t[en]; X[l]=used; });
fs.writeFileSync(path.join(SRC,'i18n/langs.json'),JSON.stringify(X));
const cov=NEU.map(l=>`${l} ${Math.round(Object.keys(X[l]).length/keys.size*100)} %`).join(', ');
console.log(`Weitere Sprachen (werden beim Veröffentlichen übersetzt): ${cov}`);
if(process.argv.includes('--neu')){ const TD=path.join(SRC,'i18n/todo'); if(!fs.existsSync(TD)) fs.mkdirSync(TD);
  NEU.forEach(l=>{ const m={}; for(const [en,de] of keys) if(!X[l][en]) m[en]=de; fs.writeFileSync(path.join(TD,l+'.json'),JSON.stringify(m,null,1)); console.log(`${l}: ${Object.keys(m).length} fehlen → src/i18n/todo/${l}.json`); }); }
