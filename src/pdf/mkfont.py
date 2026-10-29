# Erzeugt Teilmengen von DejaVu Sans Condensed (normal, fett) für das PDF-Ergebnisblatt:
# Latein inkl. Türkisch, Kyrillisch, Satzzeichen. Ausgabe: fonts.json mit Base64-TTF, Glyphen-Zuordnung und Breiten.
import json,base64,io
from fontTools import subset
from fontTools.ttLib import TTFont
U=list(range(0x20,0x7f))+list(range(0xa0,0x180))+list(range(0x400,0x460))+[0x394,0x3bc,0x2013,0x2014,0x2018,0x2019,0x201a,0x201c,0x201d,0x201e,0x2026,0x2022,0x00b7,0x2212,0x2264,0x2265,0x2192,0x2190,0x2191,0x2193,0x2713,0x00d7,0x221a,0x2030,0x20ac,0x2009,0x202f,0x2011]
out={}
for key,fn in [("r","/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf"),("b","/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf")]:
    f=TTFont(fn); o=subset.Options(); o.hinting=False; o.desubroutinize=True; o.notdef_outline=True; o.name_IDs=[1,2,3,4,6]; o.layout_features=[]; o.drop_tables+=["GSUB","GPOS","GDEF","kern","FFTM"]
    s=subset.Subsetter(o); s.populate(unicodes=U); s.subset(f)
    b=io.BytesIO(); f.save(b); data=b.getvalue()
    f2=TTFont(io.BytesIO(data)); upm=f2['head'].unitsPerEm; cmap=f2.getBestCmap(); order=f2.getGlyphOrder(); hm=f2['hmtx'].metrics
    gid={str(cp):order.index(g) for cp,g in cmap.items()}
    w=[round(hm[g][0]*1000/upm) for g in order]
    hd=f2['head']; os2=f2['OS/2']; hh=f2['hhea']
    out[key]={"ttf":base64.b64encode(data).decode(),"gid":gid,"w":w,"asc":round(hh.ascent*1000/upm),"desc":round(hh.descent*1000/upm),
      "bbox":[round(x*1000/upm) for x in (hd.xMin,hd.yMin,hd.xMax,hd.yMax)],"cap":round(getattr(os2,'sCapHeight',700)*1000/upm),"name":"DejaVuSansCondensed"+("-Bold" if key=="b" else "")}
    print(key,len(data),len(gid))
json.dump(out,open("fonts.json","w"),separators=(",",":"))
