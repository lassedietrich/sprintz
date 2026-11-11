# Sprintz – Arbeitsregeln für Claude

Sprintz ist eine Web-App (und ein Desktop-Programm für Mac und Windows) für Start- und Reaktionstraining sowie Technikauswertung in Schwimmen und Leichtathletik. Eigentümer: Lasse Dietrich (Konto `host289`). Mitentwickler: `freaky200`.

## Wer darf was

- **Nur Lasse (`host289`) veröffentlicht.** Der Zweig `main` ist die veröffentlichte Fassung (GitHub Pages und Desktop-Programm). Auf `main` wird nie direkt gepusht und nie gemergt, außer Lasse sagt es ausdrücklich in seiner eigenen Sitzung.
- Jede Person arbeitet in **ihrem eigenen Test-Zweig**:
  - `host289` → `test-host289`
  - `freaky200` → `test-freaky200`
- Arbeite nur im Test-Zweig der Person, mit der du sprichst. Frag zu Beginn nach dem Sprintz-Konto, wenn es nicht klar ist. Fremde Test-Zweige nicht ändern.
- Vor jeder Arbeit: `git fetch origin` und den eigenen Test-Zweig auf den Stand von `origin/main` bringen (`git merge origin/main`), damit keine veröffentlichten Änderungen verloren gehen.
- Fertige Änderungen landen über einen **Pull Request vom eigenen Test-Zweig nach `main`**. Lasse prüft und übernimmt.

## Testen im Desktop-Programm

Im Desktop-Programm (ab Version 1.3.0, angemeldet als `host289` oder `freaky200`) gibt es oben das Menü **Entwicklung**:
- „Testversion von host289: Zweig test-host289“
- „Testversion von freaky200: Zweig test-freaky200“
- „Normale Fassung (GitHub Pages)“

Nach jedem Push in den Test-Zweig: im Programm Cmd+R (Windows: Strg+R). Ein oranges Schild „TESTVERSION“ zeigt, welcher Stand läuft. Ein neuer Installer ist nur bei Änderungen im Ordner `desktop/` nötig; die baut GitHub erst, wenn sie auf `main` landen.

## Aufbau

- `src/template.html` – **die eigentliche Quelle** (HTML, CSS, JavaScript in einer Datei). Nur hier ändern.
- `index.html` – gebaute Fassung (Töne, Übersetzungen, Schriften eingebettet). Nie von Hand ändern, immer bauen.
- `src/i18n/tNN.json` – Übersetzungen, `src/i18n/table.json` wird daraus erzeugt.
- `src/snd/` – Startsignale (MP3), `src/pdf/fonts.json` – Schriften für das PDF.
- `desktop/` – Electron-Programm (FFmpeg-Arbeitskopie, Speichern, Testkanäle). Version in `desktop/package.json`.
- `.github/workflows/desktop.yml` – baut das Programm bei Änderungen in `desktop/` auf `main`.

## Bauen

```bash
bash src/tools/build.sh   # prüft Übersetzungen, baut index.html, prüft die Syntax
```
Danach `index.html` und `src/` committen und in den eigenen Test-Zweig pushen.

## Regeln für Inhalte

- **Sprache:** Deutsch mit „du“, korrekte Fachbegriffe aus Schwimmen und Leichtathletik.
- **Alle Texte in fünf Sprachen:** DE, EN, TR, RU, NL. Im Code immer `L("Deutsch","English")`. Neue englische Texte bekommen in einer neuen Datei `src/i18n/tNN.json` (nächste freie Nummer) je eine Zeile `["English","Türkçe","Русский","Nederlands"]`. `node src/tools/i18n.js` meldet fehlende Texte. Keine Teilsätze in Platzhaltern zusammensetzen; im Russischen kein Betonungszeichen (U+0301), die PDF-Schrift kennt es nicht.
- **Weitere Sprachen** (fr, es, it, pl, cs, da, nb, sv, ro, hr, sr, sq, uk, ku, ar): erst übersetzen, wenn Lasse veröffentlichen lässt („übernehmen“). `node src/tools/i18n.js --neu` schreibt die fehlenden Texte nach `src/i18n/todo/<code>.json`; Übersetzungen kommen nach `src/i18n/lang/<code>.json` als `{"English": "Übersetzung"}`.
- **Fachliches:** nur mit wissenschaftlichen oder institutionellen Quellen begründen.
- **Datenschutz:** Sprintz speichert **keine Videos**, nur die Daten daraus. Nie Videos hochladen oder in den Online-Speicher legen.
- **Sicherheit:** Nur der öffentliche Supabase-Schlüssel (`sb_publishable_…`) darf im Code stehen. Nie nach `service_role`- oder geheimen Schlüsseln fragen oder sie annehmen. Keine Passwörter im Code.
- **Entwicklermodus** nur für `host289` und `freaky200`.
- Commit-Nachrichten auf Deutsch, kurz, was und warum.
