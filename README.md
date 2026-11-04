# Sprintz

Start-, Reaktions- und Techniktraining für Schwimmen und Leichtathletik.

- **Web-App (Handy und Browser):** https://lassedietrich.github.io/sprintz/
- **Desktop-Programm (Mac und Windows):** [Neueste Version herunterladen](https://github.com/lassedietrich/sprintz/releases/latest)

## Desktop-Programm

Gleiche Oberfläche und gleiche Konten wie die Web-App, zusätzlich:

- Arbeitskopie mit FFmpeg: jedes Bild ein Schlüsselbild, dadurch sofortige, bildgenaue Sprünge mit den Pfeiltasten
- alle iPhone-Formate (auch HEVC/.mov), exakte Bildrate direkt aus der Datei (Zeitlupen-Originale mit 240 Bildern/s)
- Ergebnisblätter, Projekte und Videos über den normalen Speichern-Dialog

### Installation

Das Programm ist (noch) nicht bei Apple bzw. Microsoft signiert. Deshalb beim ersten Start:

- **Mac:** `Sprintz-…-mac-arm64.dmg` (Apple Silicon, ab 2020) bzw. `…-mac-x64.dmg` (Intel) öffnen und Sprintz in „Programme“ ziehen. Meldet macOS „Sprintz ist beschädigt“ oder „kann nicht geöffnet werden“: Terminal öffnen und einmal `xattr -cr /Applications/Sprintz.app` eingeben, danach startet es normal.
- **Windows:** `Sprintz-…-win-x64.exe` ausführen. Bei „Der Computer wurde durch Windows geschützt“ auf „Weitere Informationen“ → „Trotzdem ausführen“.

Neue Versionen meldet das Programm beim Start selbst.

### Neue Version veröffentlichen

Ein Tag `vX.Y.Z` auf `main` startet den Workflow `.github/workflows/desktop.yml`; er baut die Installationsdateien und hängt sie an eine neue Veröffentlichung.
Das Programm übernimmt beim Bauen die aktuelle `index.html` aus dem Repo.

## Aufbau

- `index.html` – fertige Web-App (wird aus `src/template.html` mit `src/build.py` erzeugt)
- `src/` – Quelltext, Töne, Übersetzungen (`src/i18n`), PDF-Schrift
- `desktop/` – Electron-Hülle (`main.js`, `preload.js`), Videoverarbeitung mit FFmpeg

## Zusammenarbeit und Testen (Konten host289 und freaky200)

Jede Person arbeitet in ihrem eigenen Zweig (`test-host289`, `test-freaky200`) und testet ihn im Desktop-Programm über das Menü **Entwicklung**. Nur Lasse übernimmt Änderungen nach `main` (Pull Request). Die Arbeitsregeln für Claude stehen in `CLAUDE.md`.

### Testen im Desktop-Programm

Das Desktop-Programm lädt die Web-App bei jedem Start von GitHub Pages; ein neuer Installer ist nur bei Änderungen im Ordner `desktop/` nötig.
Im Menü **Entwicklung** lässt sich die Fassung umschalten:

- **Testversion: GitHub-Zweig test** – lädt `index.html` aus dem Zweig `test`. Neu laden mit Cmd/Strg + R.
- **Testversion: Ordner Sprintz-Test** – lädt `~/Sprintz-Test/index.html` und lädt automatisch neu, sobald die Datei sich ändert.
- **Normale Fassung** – der veröffentlichte Stand.

Solange eine Testversion läuft, zeigt oben ein orangefarbenes Schild „TESTVERSION“. Funktioniert alles, wird der Stand aus `test` nach `main` übernommen.
