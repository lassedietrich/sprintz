import json,glob,sys,re
keys=json.load(open('/home/claude/startapp/i18n/keys_v1.json'))
cur=json.load(open('/tmp/claude-0/-home-claude/7c4b8c98-30ad-58e2-a4c2-18a74673fefa/scratchpad/keys2.json'))
T={}
for f in sorted(glob.glob('/home/claude/startapp/i18n/t[0-9]*.json'), key=lambda f:int(re.search(r't(\d+)\.json',f).group(1))):
    for r in json.load(open(f)):
        k=r[0]; en = keys[k]['en'] if isinstance(k,int) else k
        if en in T: print('dup',k, file=sys.stderr)
        T[en]=r[1:4]
# Prüfen: Platzhalter, die im Englischen vorkommen, sollten nicht in Übersetzungen fehlen (nur Hinweis)
import re
miss=[k['en'][:60] for k in cur if k['en'] not in T]
print('current keys',len(cur),'missing',miss, file=sys.stderr)
for en,v in T.items():
    ph=set(re.findall(r'\{\d+\}',en))
    for l,x in zip(['tr','ru','nl'],v):
        extra=set(re.findall(r'\{\d+\}',x))-ph
        if extra: print('EXTRA',l,en[:50],extra,file=sys.stderr)
json.dump(T,open('/home/claude/startapp/i18n/table.json','w'),ensure_ascii=False,separators=(',',':'))
