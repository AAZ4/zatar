/*
 * Speisekarte – hier zentral pflegen.
 * Quelle: offizielle Speisekarte des Restaurants (PDF "Zaatar_kleiner.pdf"), Stand September 2026.
 * Preise = Preise im Restaurant (bei Lieferdiensten können sie abweichen).
 *
 * Felder: name, ar (arabischer Name), desc, price, veg (vegetarisch), star (Empfehlung des Hauses),
 *         vegan (true = vegan, "wunsch" = auf Wunsch vegan zubereitbar) – vegane Gerichte haben immer auch veg: true
 * Kategorie-Felder: title/intro (Deutsch), titleAr/introAr (arabische Version unter /ar/),
 *                   noBadge: keine Ernährungs-Kennzeichnung anzeigen (z. B. Getränke)
 */
window.ZATAR_MENU = {
  manakish: {
    title: "Manakish",
    titleAr: "مناقيش",
    introAr: "طازة من فرن الحجر – ترويقة عربية على أصولها.",
    ar: "مناقيش",
    intro: "Offenes Fladenbrot frisch aus dem Steinofen – das traditionelle Frühstück der Levante.",
    items: [
      { name: "Zatar", ar: "زعتر", desc: "Gewürzmischung aus Thymian", price: 2.0, veg: true, star: true, vegan: true },
      { name: "Zatar mit Käse", ar: "زعتر جبنة", desc: "Gewürzmischung aus Thymian mit Käse", price: 2.5, veg: true },
      { name: "Zatar mit Gemüse", ar: "زعتر خضار", desc: "Gewürzmischung aus Thymian mit Gemüse", price: 3.5, veg: true, vegan: true },
      { name: "Zatar mit Muhammara", ar: "زعتر محمرة", desc: "Gewürzmischung aus Thymian mit Paprikapaste", price: 3.0, veg: true },
      { name: "Zatar Muhammara Käse", ar: "زعتر محمرة مع جبنة", desc: "Gewürzmischung aus Thymian mit Paprikapaste und Käse", price: 3.5, veg: true, star: true },
      { name: "Muhammara", ar: "محمرة", desc: "Würziger Aufstrich aus Paprikapaste", price: 2.0, veg: true, vegan: true },
      { name: "Muhammara mit Käse", ar: "محمرة جبنة", desc: "Würzige Paprikapaste und Käse", price: 2.5, veg: true },
      { name: "Akkawi Käse", ar: "جبنة عكاوي", desc: "Nahöstlicher Salzlakenkäse", price: 2.5, veg: true },
      { name: "Kashkawan Käse", ar: "جبنة قشقوان", desc: "Gouda-Käse", price: 2.5, veg: true },
      { name: "Shisch mit Käse", ar: "شيش مع جبنة", desc: "Hähnchenbrust und Käse", price: 3.0 },
      { name: "Sufiha", ar: "صفيحة بندورة", desc: "Hackfleisch mit Gemüse", price: 2.5 },
      { name: "Sufiha Joghurt", ar: "صفيحة لبن", desc: "Hackfleisch und Joghurt", price: 3.0 },
      { name: "Sufiha Granatapfel", ar: "صفيحة دبس رمان", desc: "Hackfleisch und Granatapfelsoße", price: 3.0 },
      { name: "Sufiha Käse", ar: "صفيحة مع جبنة", desc: "Hackfleisch und Käse", price: 3.5 },
      { name: "Lahmajin (Antap)", ar: "لحم بعجين", desc: "Nach Art des türkischen Lahmacun", price: 2.5, star: true },
      { name: "Tushka", ar: "توشكا", desc: "Hackfleisch mit Käse und Ei obendrauf", price: 3.5 },
      { name: "Salami", ar: "سلامي مع جبنة", desc: "Salami und Käse", price: 2.5 },
      { name: "Fleisch-Scheiben", ar: "شرائح لحم", desc: "Rindfleisch-Streifen", price: 4.5 },
      { name: "Hausgemachte Sucuk", ar: "سجق سوري", desc: "Hausgemachte Sucuk und Hähnchenwurst", price: 3.0 },
      { name: "Martadella", ar: "مرتديلا بندورة جبنة", desc: "Hähnchenwurst, Tomaten und Käse", price: 3.0 }
    ]
  },
  fatayer: {
    title: "Fatayer",
    titleAr: "فطاير",
    introAr: "فطاير محشية وبيدا – مقرمشة من برّا وطرية من جوّا.",
    ar: "فطاير",
    intro: "Gefüllte Teigtaschen und Pide – knusprig außen, saftig innen.",
    items: [
      { name: "Sucuk", ar: "سجق و جبنة تركي", desc: "Teigtaschen mit Sucuk und Käse gefüllt", price: 2.5 },
      { name: "Martadella", ar: "مارتديلا جبنة", desc: "Teigtaschen mit Hähnchenwurst gefüllt", price: 2.5 },
      { name: "Oliven", ar: "زيتون جبنة", desc: "Teigtaschen mit Oliven gefüllt – auf Wunsch ohne Käse", price: 2.5, veg: true, vegan: "wunsch" },
      { name: "Labne", ar: "لبنة", desc: "Teigtaschen mit Frischkäse gefüllt", price: 2.5, veg: true },
      { name: "Labne mit Zatar", ar: "لبنة و زعتر", desc: "Teigtaschen mit Frischkäse und Zatar", price: 3.5, veg: true },
      { name: "Labne mit Gemüse", ar: "لبنة و خضرة", desc: "Teigtaschen mit Frischkäse und Gemüse gefüllt", price: 3.5, veg: true },
      { name: "Akkawi mit Oliven", ar: "عكاوي جبنة و زيتون", desc: "Pide mit nahöstlichem Salzlakenkäse und Oliven", price: 3.0, veg: true },
      { name: "Akkawi mit Tomaten", ar: "عكاوي جبنة و بندورة", desc: "Pide mit nahöstlichem Salzlakenkäse und Tomaten", price: 3.0, veg: true },
      { name: "Akkawi mit Spinat", ar: "عكاوي جبنة و سبانخ", desc: "Pide mit nahöstlichem Salzlakenkäse und Spinat", price: 3.0, veg: true },
      { name: "Spinat", ar: "سبانخ", desc: "Teigtasche mit Spinat gefüllt", price: 2.5, veg: true, vegan: true },
      { name: "Spinat mit Käse", ar: "سبانخ جبنة", desc: "Teigtaschen mit Spinat und Käse gefüllt", price: 3.0, veg: true }
    ]
  },
  pizza: {
    title: "Pizzen",
    titleAr: "بيتزا",
    introAr: "من فرن الحجر، وكلّها مع جبنة.",
    ar: "بيتزا",
    intro: "Aus dem Steinofen – alle Pizzen werden mit Käse zubereitet.",
    items: [
      { name: "Margherita", ar: "بيتزا مرغريتا", desc: "Tomatensoße und Käse", price: 9.0, veg: true },
      { name: "Vegetarisch", ar: "بيتزا خضار", desc: "Belegt mit Oliven, Paprika und Champignons", price: 11.0, veg: true },
      { name: "Martadella", ar: "بيتزا مرتديلا", desc: "Mit Hähnchen-Mortadella", price: 10.5 },
      { name: "Spinat", ar: "بيتزا سبانخ", desc: "Mit Spinat", price: 10.5, veg: true },
      { name: "Vier Jahreszeiten", ar: "بيتزا الفصول الأربعة", desc: "Belegt mit Paprika, Oliven, Tomaten und Champignons", price: 11.0, veg: true },
      { name: "Hähnchen", ar: "بيتزا دجاج", desc: "Mit Hähnchen", price: 11.0 },
      { name: "Sucuk", ar: "بيتزا سجق", desc: "Mit Sucuk", price: 10.0 },
      { name: "Salami", ar: "بيتزا سلامي", desc: "Mit Salami", price: 10.0 },
      { name: "Champignons", ar: "بيتزا فطر", desc: "Mit Champignons", price: 10.0, veg: true }
    ]
  },
  teller: {
    title: "Arabische Teller",
    titleAr: "صحون عربية",
    introAr: "ترويقة وغدا متل البيت – فلافل، حمص، فول وأكتر.",
    ar: "صحون",
    intro: "Frühstück und Mittag wie in der Heimat – Falafel, Hummus, Foul und mehr.",
    items: [
      { name: "Falafel-Teller", ar: "صحن فلافل", desc: "Knusprige Falafel", price: 7.5, veg: true, star: true, vegan: true },
      { name: "Foul mit Joghurt", ar: "صحن فول باللبن", desc: "Saubohnen mit Joghurt, Knoblauch und Olivenöl", price: 7.5, veg: true, star: true },
      { name: "Musabbaha", ar: "صحن مسبحة", desc: "Ganze Kichererbsen mit Tahina und Gewürzen", price: 7.5, veg: true, vegan: true },
      { name: "Hummus", ar: "صحن حمص", desc: "Hausgemachter Hummus", price: 7.5, veg: true, vegan: true },
      { name: "Fatteh (klein)", ar: "تسقية حجم صغير", desc: "Brot mit Joghurt, Kichererbsen und Nüssen", price: 7.5, veg: true },
      { name: "Fatteh (groß)", ar: "تسقية حجم كبير", desc: "Brot mit Joghurt, Kichererbsen und Nüssen", price: 9.5, veg: true },
      { name: "Eier mit Sucuk", ar: "بيض بالسجق", desc: "Gebratene Eier mit würziger Rindswurst (Sucuk)", price: 7.5 },
      { name: "Rührei", ar: "بيض مقلي", desc: "Frisch zubereitet", price: 6.5, veg: true },
      { name: "Gemüseteller", ar: "صحن خضار", desc: "Frisches Gemüse", price: 3.5, veg: true, vegan: true },
      { name: "Falafel mini", ar: "فلافل خرطوش", desc: "Kleiner Falafel-Wrap", price: 3.0, veg: true, vegan: true },
      { name: "Foul mit Kichererbsen", ar: "فول مدمس", desc: "Saubohnen mit Kichererbsen", price: 7.0, veg: true, vegan: true }
    ]
  },
  drinks: {
    title: "Getränke",
    titleAr: "مشروبات",
    introAr: "شي بارد يبرّد عالقلب، أو فنجان قهوة بعد الأكل.",
    ar: "مشروبات",
    intro: "Kalt, erfrischend – oder ein Mokka zum Abschluss.",
    noBadge: true,
    items: [
      { name: "Cola", ar: "كولا", desc: "", price: 2.5, veg: true },
      { name: "Fanta", ar: "فانتا", desc: "", price: 2.5, veg: true },
      { name: "Sprite", ar: "سبرايت", desc: "", price: 2.5, veg: true },
      { name: "Wasser", ar: "مياه", desc: "", price: 1.5, veg: true },
      { name: "Ayran", ar: "عيران", desc: "Joghurtgetränk", price: 2.0, veg: true },
      { name: "Capri-Sonne", ar: "كابري زون", desc: "", price: 1.5, veg: true },
      { name: "Eistee", ar: "شاي مثلّج", desc: "", price: 1.5, veg: true },
      { name: "Mokka", ar: "قهوة موكا", desc: "", price: 2.0, veg: true }
    ]
  }
};
