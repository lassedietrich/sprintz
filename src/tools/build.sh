#!/usr/bin/env bash
# Baut index.html aus src/template.html (Töne, Übersetzungen, Schriften werden eingebettet).
# Aufruf im Hauptordner: bash src/tools/build.sh
set -e
cd "$(dirname "$0")/.."
[ -d tools/node_modules ] || (cd tools && npm install --no-audit --no-fund >/dev/null)
node tools/i18n.js || echo "⚠ Übersetzungen fehlen (siehe oben)"
python3 build.py
cp startsignal-trainer.html ../index.html
rm -f startsignal-trainer.html
node --check <(python3 -c "import re;s=open('../index.html').read();print(max(re.findall(r'<script>([\s\S]*?)</script>',s),key=len))") && echo "✓ index.html gebaut"
