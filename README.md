# Zatar Darmstadt – Website

Statische One-Page-Website (HTML/CSS/JS, kein Build nötig) für **Zatar – Arabische Küche & Patisserie**, Rheinstraße 46, 64283 Darmstadt.

## Struktur
| Datei | Inhalt |
|---|---|
| `index.html` | Startseite mit allen Abschnitten |
| `js/menu.js` | **Speisekarte** – Gerichte & Preise hier pflegen |
| `js/main.js` | Navigation, „Jetzt geöffnet“-Anzeige, Menü-Tabs, Karte |
| `css/style.css` | Design (Farben oben unter `:root`) |
| `impressum.html`, `datenschutz.html` | Pflichtseiten (Vorlagen) |

## Zweisprachig (Deutsch / Arabisch)
| Datei | Inhalt |
|---|---|
| `index.html`, `speisekarte.html`, `manakish-fatayer.html` | Deutsche Version |
| `ar/index.html`, `ar/speisekarte.html` | Arabische Version (`dir="rtl"`, eigener Ton für arabische Gäste; keine Erklärseite) |
| `css/rtl.css` | Spiegelungen für Rechts-nach-links + arabische Schriften (Reem Kufi / Noto Kufi Arabic) |
| `css/loader.css`, `js/loader.js` | Ladebildschirm + Sprachauswahl beim ersten Besuch (gemeinsam für beide Sprachen) |

- Erster Besuch: Nach dem Laden erscheint die Sprachauswahl. Die Wahl wird im Browser gespeichert (`localStorage: zatarLang`).
- Wer Arabisch gewählt hat, wird von der deutschen Startseite automatisch auf `/ar/` geleitet. Der Umschalter oben („العربية“ / „Deutsch“) ändert die gespeicherte Wahl.
- Speisekarte bleibt zentral in `js/menu.js` (arabische Felder: `ar`, `titleAr`, `introAr`).
- Vor dem Livegang: `hreflang`-Links auf absolute URLs mit eigener Domain umstellen.

## Lokal ansehen
```bash
npx http-server -p 5500
```

## Vor dem Livegang – TODO
- [ ] **Fotos einfügen** (größter Effekt!): echte Bilder von Manakish, Fatayer, Laden, Inhaber in `images/` legen und die Platzhalter ersetzen (Hero, Signature-Karten, Geschichte).
- [ ] **Geschichte** im Abschnitt „Unsere Geschichte“ mit dem Inhaber abstimmen (aktuell Entwurf).
- [ ] **Speisekarte/Preise/Öffnungszeiten** bestätigen (Quelle: Wolt, Sept. 2026).
- [ ] Ggf. **Süßspeisen/Patisserie** ergänzen (Instagram heißt „zatar.patisserie“).
- [ ] **Impressum**: E-Mail, USt-ID ergänzen. **Datenschutz** mit Generator prüfen.
- [ ] Google Fonts lokal einbinden (DSGVO).
- [ ] Domain + Hosting (z. B. Netlify, GitHub Pages, IONOS), `og:image` setzen.
- [ ] Google-Unternehmensprofil mit der Website verlinken.
