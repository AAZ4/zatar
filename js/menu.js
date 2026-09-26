/*
 * Speisekarte – hier zentral pflegen.
 * Stand: Wolt-Speisekarte, September 2026.
 * veg: true = vegetarisch
 */
window.ZATAR_MENU = {
  manakish: {
    title: "Manakish",
    ar: "مناقيش",
    intro: "Offenes Fladenbrot aus dem Ofen – das traditionelle Frühstück der Levante.",
    items: [
      { name: "Manakish Zaatar", desc: "Wilder Oregano, Sesam und Sumach", price: 4.0, veg: true, star: true },
      { name: "Manakish Zaatar mit Käse", desc: "Wilder Oregano, Sesam, Sumach und Käse", price: 5.0, veg: true },
      { name: "Manakish Muhammara", desc: "Orientalische Paprika-Walnuss-Paste", price: 4.0, veg: true },
      { name: "Manakish Muhammara mit Käse", desc: "Paprika-Walnuss-Paste mit Käse überbacken", price: 5.0, veg: true, star: true },
      { name: "Manakish Akkawi", desc: "Mit nahöstlichem Salzlakenkäse", price: 5.0, veg: true },
      { name: "Manakish Oliven mit Käse", desc: "Oliven und Käse auf frischem Teig", price: 5.0, veg: true },
      { name: "Manakish Gouda", desc: "Mit Gouda überbacken", price: 4.0, veg: true },
      { name: "Manakish Musahab", desc: "Mit Hähnchenbrust und Paprika", price: 5.0 },
      { name: "Lahmajin", desc: "Mit Rind, Petersilie, Zwiebeln und Paprika", price: 5.0, star: true },
      { name: "Sfiha", desc: "Mit Rind und Gemüsemischung", price: 5.5 }
    ]
  },
  fatayer: {
    title: "Fatayer",
    ar: "فطاير",
    intro: "Gefüllte Teigtaschen – knusprig außen, saftig innen.",
    items: [
      { name: "Fatayer Spinat", desc: "Spinat, Zwiebeln und Granatapfel", price: 5.0, veg: true, star: true },
      { name: "Fatayer Oliven", desc: "Oliven und Käse", price: 5.0, veg: true },
      { name: "Fatayer Hummus", desc: "Gefüllt mit cremigem Hummus", price: 7.0, veg: true },
      { name: "Fatayer Muhammara", desc: "Orientalische Paprika-Walnuss-Paste", price: 7.0, veg: true },
      { name: "Fatayer eingelegtes Gemüse", desc: "Mit gemischtem eingelegtem Gemüse", price: 5.0, veg: true },
      { name: "Fatayer Mortadella", desc: "Hähnchen-Mortadella und Käse", price: 5.5 },
      { name: "Fatayer Sucuk", desc: "Rinder-Sucuk und Käse", price: 5.0 },
      { name: "Fatayer Nutella", desc: "Die süße Versuchung zum Schluss", price: 4.0, veg: true }
    ]
  },
  pizza: {
    title: "Pizzen",
    ar: "بيتزا",
    intro: "Alle Pizzen werden mit Käse zubereitet.",
    items: [
      { name: "Pizza Margherita", desc: "Mit Tomatensoße", price: 9.0, veg: true },
      { name: "Pizza Funghi", desc: "Mit Champignons", price: 12.0, veg: true },
      { name: "Pizza Vegetarisch", desc: "Schwarze & grüne Oliven, Paprika, Champignons", price: 13.0, veg: true },
      { name: "Pizza Spinat", desc: "Spinat, Granatapfel und Zwiebeln", price: 12.0, veg: true, star: true },
      { name: "Pizza Hähnchen", desc: "Hähnchenbrust und Paprika", price: 13.5 },
      { name: "Pizza Salami", desc: "Rindersalami", price: 13.0 },
      { name: "Pizza Sucuk", desc: "Rinder-Sucuk", price: 12.0 },
      { name: "Pizza Mortadella", desc: "Hähnchen-Mortadella", price: 12.0 }
    ]
  },
  drinks: {
    title: "Getränke",
    ar: "مشروبات",
    intro: "Erfrischendes zum Essen.",
    items: [
      { name: "Ayran", desc: "Joghurtgetränk, leicht gesalzen · 0,25 l", price: 2.5, veg: true },
      { name: "Gerolsteiner Naturell", desc: "Stilles Mineralwasser · 0,33 l", price: 2.0 },
      { name: "Coca-Cola", desc: "0,33 l", price: 3.0 },
      { name: "Coca-Cola Zero", desc: "0,33 l", price: 3.0 },
      { name: "Fanta", desc: "0,33 l", price: 3.0 },
      { name: "Sprite", desc: "0,33 l", price: 3.0 }
    ]
  }
};
