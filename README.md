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
| `kunefe.html`, `ar/kunefe.html` | Künefe-Seite: 3D-Künefe über der Flamme, beim Scrollen Schicht für Schicht erklärt (`js/kunefe-scene.js`, `css/kunefe.css`) |
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

### Pflicht (rechtlich, vor dem Entfernen von `noindex`)
- [ ] **Google Fonts lokal einbinden** (Fraunces, Inter, Reem Kufi, Noto Kufi Arabic in `fonts/`), Google-Fonts-Abschnitt aus `datenschutz.html` streichen – Abmahnrisiko (IP-Übertragung an Google). *Kann ohne Inhaber erledigt werden – bei der nächsten Änderung mitmachen.*
- [ ] **„Alle Preise inkl. MwSt.“** unter die Speisekarte (DE + AR) – Preisangabenverordnung. *Bei der nächsten Änderung mitmachen.*
- [ ] **Impressum** vom Inhaber bestätigen lassen: Name, Anschrift (Rheinstraße 44–46 ist korrekt), Telefon, E-Mail, USt-ID / Steuernummer-Angabe, Rechtsform.
- [ ] **Datenschutzerklärung** an den tatsächlichen Stand anpassen (nach Fonts-Umstellung) und mit Generator (z. B. e-recht24) oder IHK/DEHOGA prüfen lassen.
- [ ] **Kling-Lizenz klären**: Künefe-Video (`images/kunefe/d|m/`) stammt aus dem Kling-Gratis-Tarif (Wasserzeichen). Kommerzielle Nutzung prüfen, ggf. 1 Monat Kling bezahlen und ohne Wasserzeichen neu exportieren, dann Einzelbilder neu erzeugen.
- [ ] **Vegan-/Vegetarisch-Kennzeichnung** in `js/menu.js` vom Inhaber bestätigen lassen.
- [ ] Nur eigene oder lizenzierte Bilder verwenden (keine Lieferando-/Uber-Eats-/Google-Fotos).

### Sollte bald gemacht werden
- [ ] **Allergene-Hinweis** („Informationen zu Allergenen erhalten Sie im Restaurant“) unter die Speisekarte (DE + AR). *Bei der nächsten Änderung mitmachen.*
- [ ] Google-Bewertungen: Namen der Bewerter nur abgekürzt zeigen.
- [ ] **Domain**: `.de` bei INWX (Domaininhaber = Restaurant/Inhaber, Auto-Verlängerung an), Nameserver auf Cloudflare, Custom Domain im Worker eintragen. Bei Lieferando nach Übertragung von `zatar-darmstadt.de` fragen (läuft über takeaway.com), sonst `zatardarmstadt.de`.
- [ ] Danach: **QR-Code für die Tüten** (Ziel: Startseite der eigenen Domain, SVG + PNG, Fehlerkorrektur H), `og:image` und `canonical` auf die neue Domain setzen, `noindex` entfernen.

### Inhalt
- [ ] **Fotos einfügen** (größter Effekt!): echte Bilder von Manakish, Fatayer, Laden, Inhaber in `images/` legen und die Platzhalter ersetzen (Hero, Signature-Karten, Geschichte).
- [ ] **Geschichte** im Abschnitt „Unsere Geschichte“ mit dem Inhaber abstimmen (aktuell Entwurf).
- [ ] **Speisekarte/Preise/Öffnungszeiten** bestätigen (Quelle: Wolt, Sept. 2026). Künefe-Preis fehlt noch.
- [ ] Ggf. **Süßspeisen/Patisserie** ergänzen (Instagram heißt „zatar.patisserie“).
- [ ] Google-Unternehmensprofil mit der Website verlinken.
