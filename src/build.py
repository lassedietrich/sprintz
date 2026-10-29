import base64,json,re
s=open("template.html").read()
keys=["series","long","marks","horn","gun","onmarks","set"]+[f"d{i}" for i in range(1,8)]
d={k:base64.b64encode(open(f"snd/{k}.mp3","rb").read()).decode() for k in keys}
s=s.replace("__I18N__",open("i18n/table.json").read())
s=s.replace("__FONTS__",open("pdf/fonts.json").read())
open("startsignal-trainer.html","w").write(s.replace("__SOUNDS__",json.dumps(d)))
open("/tmp/c.js","w").write(re.search(r"<script>(.*)</script>",open("startsignal-trainer.html").read(),re.S).group(1))
