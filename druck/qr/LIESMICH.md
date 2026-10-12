# QR-Code für Tüten, Flyer & Werbung

**Inhalt:** `https://zatar-restaurant.de/qr` → leitet (302) zur Startseite weiter.
Ziel ändern ohne neu zu drucken: Datei `_redirects` im Projekt (Zeile `/qr  /  302`).

| Datei | Wofür |
|---|---|
| `zatar-qr-schwarz.svg / .pdf` | Druckerei (Vektor) – für braunes Kraftpapier |
| `zatar-qr-olive.svg / .pdf` | Druckerei (Vektor) – für weißes Papier |
| `*.png` | Word, Canva, Vorschau (ca. 2200 px) |
| `zatar-qr-vorschau.png` | Ansicht mit Hinweistext |

- Fehlerkorrektur **H (30 %)**, Rand 4 Module – Rand beim Druck nicht abschneiden.
- Druckgröße mindestens **2,5 cm**, besser 3–4 cm. Dunkel auf hell.
- Vor dem Großdruck auf echtem Tütenmaterial mit iPhone und Android testen.
- Erstellt am 12.10.2026, geprüft (Auslesen in 2200 / 300 / 120 px).

**Damit der Code für immer funktioniert:** Domain `zatar-restaurant.de` bei INWX automatisch verlängern lassen
(Zahlungsmittel hinterlegt) und die Weiterleitung `/qr` in `_redirects` nicht löschen.
