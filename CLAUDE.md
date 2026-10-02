# Zatar – Arabische Küche & Patisserie, Darmstadt

Statische Website (HTML/CSS/JS, kein Build). Details zur Struktur und offene TODOs: siehe `README.md`.

## Design & UI
- Bei allen Design-, Layout-, UI- und UX-Aufgaben den Skill **ui-ux-pro-max** verwenden.
- Den Skill vor allem als **Prüfwerkzeug** nutzen (Barrierefreiheit, Kontrast, Fokus, Touch-Ziele, Motion). Seine Farb-, Schrift- und Muster-Vorschläge nur übernehmen, wenn sie zu den Punkten unten passen.
- Python für das Skill-Skript: `python` (falls nicht im PATH: `C:\Users\A.Alzoubi\AppData\Local\Programs\Python\Python312\python.exe`).

## Feste Vorgaben (nicht ohne Rückfrage ändern)
- Sprache **Deutsch** (`lang="de"`), arabische Akzente über die Schrift **Reem Kufi**; Überschriften **Fraunces**, Text **Inter**.
- Farben nur über die Variablen in `css/style.css` (`:root`), dunkles Olivgrün als Grundton (`#1f2a1c`).
- Speisekarte wird in `js/menu.js` gepflegt – nicht in HTML duplizieren.
- **Keine Reservierungen** (`acceptsReservations: False`) – keine Reservierungs-CTAs einbauen.
- 3D-Hero (`js/hero3d.js`, three.js) mit 2D-Ersatzgrafik – Fallback und `prefers-reduced-motion` müssen weiter funktionieren.
- Pflichtseiten `impressum.html` und `datenschutz.html` erhalten; Seite ist noch Testversion (`noindex`).
